from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from admanagement.core.config import Settings
from admanagement.services.activity_analysis import normalize_iso_datetime
from admanagement.services.logon_analysis import LogonAnalysisService
from admanagement.services.runtime_config import RuntimeConfigService


LOGON_EVENT_MAP = {
    4624: "Logon",
    4634: "Logoff",
    4625: "LogonFailure",
    4740: "AccountLockout",
}
CHECKPOINT_TYPE = "logon_winrm"


class LogonIngestor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.analysis = LogonAnalysisService()
        self.runtime = RuntimeConfigService(settings)

    def describe(self) -> dict[str, object]:
        effective = self.runtime.effective_runtime()
        return {
            "collector": "logon_ingestor",
            "mode": self.settings.event_ingestor_mode,
            "window_minutes": self.settings.event_window_minutes,
            "domain_controllers": effective["event_dc_list"],
        }

    def run(
        self,
        *,
        window_minutes_override: int | None = None,
        ignore_checkpoints: bool = False,
        domain_controllers: list[str] | None = None,
    ) -> dict[str, object]:
        effective = self.runtime.effective_runtime()
        configured_domain_controllers = domain_controllers or effective["event_dc_list"]
        effective_window_minutes = window_minutes_override or self.settings.event_window_minutes

        totals = {
            "collector": "logon_ingestor",
            "window_minutes": effective_window_minutes,
            "ignore_checkpoints": ignore_checkpoints,
            "domain_controllers": configured_domain_controllers,
            "imported_rows": 0,
            "duplicate_rows": 0,
            "polls": [],
        }

        for dc in configured_domain_controllers:
            try:
                poll = self._poll_domain_controller(
                    dc,
                    window_minutes=effective_window_minutes,
                    ignore_checkpoint=ignore_checkpoints,
                )
            except Exception as exc:
                poll = {
                    "domain_controller": dc,
                    "error": str(exc),
                    "fetched_rows": 0,
                    "imported_rows": 0,
                    "duplicate_rows": 0,
                }
            totals["polls"].append(poll)
            totals["imported_rows"] += int(poll.get("imported_rows", 0))
            totals["duplicate_rows"] += int(poll.get("duplicate_rows", 0))

        totals["timestamp_utc"] = datetime.now(timezone.utc).isoformat()
        return totals

    def summary(self, limit: int = 10) -> dict[str, Any]:
        return self.analysis.summarize(limit=limit)

    def query(self, **kwargs: Any) -> dict[str, Any]:
        return self.analysis.query_logons(**kwargs)

    def export_csv(self, **kwargs: Any) -> str:
        return self.analysis.export_csv(**kwargs)

    def _poll_domain_controller(
        self,
        domain_controller: str,
        *,
        window_minutes: int,
        ignore_checkpoint: bool,
    ) -> dict[str, object]:
        previous_checkpoint = None if ignore_checkpoint else self.analysis.get_checkpoint(CHECKPOINT_TYPE, domain_controller)
        window_end = datetime.now(timezone.utc)
        if previous_checkpoint is None:
            window_start = window_end - timedelta(minutes=window_minutes)
        else:
            window_start = previous_checkpoint.astimezone(timezone.utc) - timedelta(seconds=self.settings.event_overlap_seconds)

        remote_result = self._collect_via_winrm(domain_controller, window_start, window_end)
        records = list(remote_result.get("records", []))
        import_result = self.analysis.import_records(records=records, source_name=domain_controller)

        checkpoint_time = window_end
        latest_remote_time = remote_result.get("last_activity_time_utc")
        if latest_remote_time:
            checkpoint_time = self._parse_datetime(latest_remote_time)
        self.analysis.update_checkpoint(CHECKPOINT_TYPE, domain_controller, checkpoint_time)

        return {
            "domain_controller": domain_controller,
            "window_start_utc": window_start.astimezone(timezone.utc).isoformat(),
            "window_end_utc": window_end.astimezone(timezone.utc).isoformat(),
            "fetched_rows": len(records),
            "imported_rows": import_result["imported_rows"],
            "duplicate_rows": import_result["duplicate_rows"],
            "last_activity_time_utc": latest_remote_time,
        }

    def _collect_via_winrm(self, domain_controller: str, start_time: datetime, end_time: datetime) -> dict[str, Any]:
        from pypsrp.client import Client

        effective = self.runtime.effective_runtime()
        client = Client(
            server=domain_controller,
            username=self._resolve_winrm_username(),
            password=effective["winrm_password"],
            ssl=effective["winrm_use_ssl"],
            port=effective["winrm_port"],
            auth=effective["winrm_auth"],
            cert_validation=effective["winrm_server_cert_validation"],
            operation_timeout=self.settings.winrm_operation_timeout,
            read_timeout=self.settings.winrm_read_timeout,
        )
        stdout, streams, had_errors = client.execute_ps(self._build_remote_script(start_time, end_time, self.settings.event_max_records_per_poll))
        if had_errors:
            detail = self._format_psrp_streams(streams) or stdout.strip() or "PowerShell returned errors with no message."
            raise RuntimeError(f"WinRM collection failed for {domain_controller}: {detail}")

        payload = json.loads(stdout.strip() or '{"records":[],"last_activity_time_utc":null}')
        if payload.get("remote_error"):
            raise RuntimeError(f"WinRM collection failed for {domain_controller}: {payload['remote_error']}")
        return payload

    def _build_remote_script(self, start_time: datetime, end_time: datetime, max_records: int) -> str:
        start_iso = start_time.astimezone(timezone.utc).isoformat()
        end_iso = end_time.astimezone(timezone.utc).isoformat()
        event_ids = ",".join(str(event_id) for event_id in LOGON_EVENT_MAP)

        return f"""
try {{
$start = [datetimeoffset]::Parse('{start_iso}')
$end = [datetimeoffset]::Parse('{end_iso}')
$startZulu = $start.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$endZulu = $end.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$eventIds = @({event_ids})
$eventIdPredicate = ($eventIds | ForEach-Object {{ "EventID=$_" }}) -join ' or '
$maxRecords = {max_records}

function Get-EventDataMap {{
    param([System.Diagnostics.Eventing.Reader.EventRecord]$Event)
    $map = @{{}}
    $xml = [xml]$Event.ToXml()
    foreach ($node in @($xml.Event.EventData.Data)) {{
        $name = [string]$node.Name
        if ([string]::IsNullOrWhiteSpace($name)) {{ continue }}
        $map[$name] = [string]$node.'#text'
    }}
    return $map
}}

function Get-FirstField {{
    param([hashtable]$Map, [string[]]$Names)
    foreach ($name in $Names) {{
        if ($Map.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$name])) {{
            return [string]$Map[$name]
        }}
    }}
    return ''
}}

function New-EventFilterXml {{
    param([string]$Path, [string]$Predicate, [string]$StartZulu, [string]$EndZulu)
    return @"
<QueryList>
  <Query Id="0" Path="$Path">
    <Select Path="$Path">*[System[($Predicate) and TimeCreated[@SystemTime&gt;='$StartZulu' and @SystemTime&lt;='$EndZulu']]]</Select>
  </Query>
</QueryList>
"@
}}

$filterXml = New-EventFilterXml -Path 'Security' -Predicate $eventIdPredicate -StartZulu $startZulu -EndZulu $endZulu
$events = @()
try {{
    $events = @(
        Get-WinEvent -FilterXml ([xml]$filterXml) -MaxEvents $maxRecords -ErrorAction Stop |
        Sort-Object TimeCreated
    )
}}
catch [System.Exception] {{
    if ($_.FullyQualifiedErrorId -notlike '*NoMatchingEventsFound*' -and $_.FullyQualifiedErrorId -notlike '*ObjectNotFound*') {{
        throw
    }}
}}

$records = @()
foreach ($event in $events) {{
    $data = Get-EventDataMap -Event $event
    $targetUser = ''
    $targetDomain = ''
    $sourceWorkstation = ''
    $sourceIp = ''
    $sourcePort = ''
    $logonType = ''
    $authenticationPackage = ''
    $logonId = ''
    $eventType = ''

    switch ($event.Id) {{
        4624 {{
            $targetUser = Get-FirstField -Map $data -Names @('TargetUserName')
            $targetDomain = Get-FirstField -Map $data -Names @('TargetDomainName')
            $sourceWorkstation = Get-FirstField -Map $data -Names @('WorkstationName')
            $sourceIp = Get-FirstField -Map $data -Names @('IpAddress')
            $sourcePort = Get-FirstField -Map $data -Names @('IpPort')
            $logonType = Get-FirstField -Map $data -Names @('LogonType')
            $authenticationPackage = Get-FirstField -Map $data -Names @('AuthenticationPackageName')
            $logonId = Get-FirstField -Map $data -Names @('TargetLogonId')
            $eventType = 'Logon'
        }}
        4634 {{
            $targetUser = Get-FirstField -Map $data -Names @('TargetUserName')
            $targetDomain = Get-FirstField -Map $data -Names @('TargetDomainName')
            $sourceWorkstation = Get-FirstField -Map $data -Names @('WorkstationName')
            $sourceIp = Get-FirstField -Map $data -Names @('IpAddress')
            $sourcePort = Get-FirstField -Map $data -Names @('IpPort')
            $logonType = Get-FirstField -Map $data -Names @('LogonType')
            $authenticationPackage = Get-FirstField -Map $data -Names @('AuthenticationPackageName')
            $logonId = Get-FirstField -Map $data -Names @('TargetLogonId', 'SubjectLogonId')
            $eventType = 'Logoff'
        }}
        4625 {{
            $targetUser = Get-FirstField -Map $data -Names @('TargetUserName')
            $targetDomain = Get-FirstField -Map $data -Names @('TargetDomainName')
            $sourceWorkstation = Get-FirstField -Map $data -Names @('WorkstationName')
            $sourceIp = Get-FirstField -Map $data -Names @('IpAddress')
            $sourcePort = Get-FirstField -Map $data -Names @('IpPort')
            $logonType = Get-FirstField -Map $data -Names @('LogonType')
            $authenticationPackage = Get-FirstField -Map $data -Names @('AuthenticationPackageName', 'AuthenticationPackage')
            $logonId = Get-FirstField -Map $data -Names @('SubjectLogonId')
            $eventType = 'LogonFailure'
        }}
        4740 {{
            $targetUser = Get-FirstField -Map $data -Names @('TargetUserName')
            $targetDomain = Get-FirstField -Map $data -Names @('TargetDomainName')
            $sourceWorkstation = Get-FirstField -Map $data -Names @('CallerComputerName', 'WorkstationName')
            $eventType = 'AccountLockout'
        }}
        default {{
            continue
        }}
    }}

    if ([string]::IsNullOrWhiteSpace($targetUser) -or $targetUser -in @('ANONYMOUS LOGON','LOCAL SERVICE','NETWORK SERVICE','SYSTEM')) {{
        continue
    }}

    $records += [pscustomobject]@{{
        activity_time_utc = $event.TimeCreated.ToUniversalTime().ToString('o')
        actor = $targetUser
        target_domain_name = $targetDomain
        event_type = $eventType
        domain_controller = $env:COMPUTERNAME
        source_workstation = $sourceWorkstation
        source_ip_address = $sourceIp
        source_port = $sourcePort
        logon_type = $logonType
        authentication_package = $authenticationPackage
        logon_id = $logonId
        event_id = [int]$event.Id
        event_record_id = [string]$event.RecordId
    }}
}}

$lastActivity = $null
if ($records.Count -gt 0) {{
    $lastActivity = $records[$records.Count - 1].activity_time_utc
}}

[pscustomobject]@{{
    records = @($records)
    last_activity_time_utc = $lastActivity
}} | ConvertTo-Json -Depth 8 -Compress
}}
catch {{
    [pscustomobject]@{{
        records = @()
        last_activity_time_utc = $null
        remote_error = $_.Exception.Message
    }} | ConvertTo-Json -Depth 8 -Compress
}}
""".strip()

    def _resolve_winrm_username(self) -> str:
        effective = self.runtime.effective_runtime()
        username = str(effective["winrm_username"]).strip()
        if not username or "\\" in username or "@" in username:
            return username

        domain = str(effective["winrm_domain"]).strip()
        if not domain:
            for component in str(effective["ldap_base_dn"]).split(","):
                key, _, value = component.partition("=")
                if key.strip().upper() == "DC" and value.strip():
                    domain = value.strip().upper()
                    break
        return f"{domain}\\{username}" if domain else username

    def _parse_datetime(self, value: str) -> datetime:
        normalized = normalize_iso_datetime(value)
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def _format_psrp_streams(self, streams: Any) -> str:
        messages: list[str] = []
        for stream_name in ("error", "warning", "verbose", "debug"):
            for item in getattr(streams, stream_name, []) or []:
                message = getattr(item, "message", None) or str(item)
                if message:
                    messages.append(f"{stream_name}: {message}")
        return " | ".join(messages)
