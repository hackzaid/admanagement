from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from admanagement.core.config import Settings
from admanagement.services.activity_analysis import ActivityAnalysisService
from admanagement.services.activity_analysis import normalize_iso_datetime
from admanagement.services.runtime_config import RuntimeConfigService


ACTION_EVENT_IDS = [4720, 4726, 4738, 4741, 4742, 4743, 5136, 5137, 5141]
CHECKPOINT_TYPE = "activity_winrm"


@dataclass(slots=True)
class IngestCheckpoint:
    domain_controller: str
    event_id: int
    timestamp_utc: datetime


class EventIngestor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.analysis = ActivityAnalysisService(settings)
        self.runtime = RuntimeConfigService(settings)

    def describe(self) -> dict[str, object]:
        effective = self.runtime.effective_runtime()
        return {
            "collector": "event_ingestor",
            "mode": self.settings.event_ingestor_mode,
            "window_minutes": self.settings.event_window_minutes,
            "overlap_seconds": self.settings.event_overlap_seconds,
            "max_records_per_poll": self.settings.event_max_records_per_poll,
            "domain_controllers": effective["event_dc_list"],
        }

    def run(
        self,
        *,
        window_minutes_override: int | None = None,
        ignore_checkpoints: bool = False,
        skip_origin_correlation: bool = False,
        domain_controllers: list[str] | None = None,
    ) -> dict[str, object]:
        if self.settings.event_ingestor_mode.lower() != "winrm":
            return {
                "collector": "event_ingestor",
                "mode": self.settings.event_ingestor_mode,
                "message": "Only winrm mode is currently implemented.",
            }

        effective = self.runtime.effective_runtime()
        configured_domain_controllers = domain_controllers or effective["event_dc_list"]
        if not configured_domain_controllers:
            return {
                "collector": "event_ingestor",
                "mode": self.settings.event_ingestor_mode,
                "message": "No domain controllers configured in ADMANAGEMENT_EVENT_DC_LIST.",
            }

        effective_window_minutes = window_minutes_override or self.settings.event_window_minutes

        totals = {
            "collector": "event_ingestor",
            "mode": self.settings.event_ingestor_mode,
            "window_minutes": effective_window_minutes,
            "ignore_checkpoints": ignore_checkpoints,
            "skip_origin_correlation": skip_origin_correlation,
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
                    skip_origin_correlation=skip_origin_correlation,
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

    def import_csv(self, path: str) -> dict[str, object]:
        return self.analysis.import_csv(path)

    def summary(self, limit: int = 10) -> dict[str, object]:
        return self.analysis.summarize(limit=limit)

    def _poll_domain_controller(
        self,
        domain_controller: str,
        *,
        window_minutes: int,
        ignore_checkpoint: bool,
        skip_origin_correlation: bool,
    ) -> dict[str, object]:
        previous_checkpoint = None if ignore_checkpoint else self.analysis.get_checkpoint(CHECKPOINT_TYPE, domain_controller)
        window_end = datetime.now(timezone.utc)

        if previous_checkpoint is None:
            window_start = window_end - timedelta(minutes=window_minutes)
        else:
            window_start = previous_checkpoint.astimezone(timezone.utc) - timedelta(seconds=self.settings.event_overlap_seconds)

        remote_result = self._collect_via_winrm(
            domain_controller=domain_controller,
            start_time=window_start,
            end_time=window_end,
            skip_origin_correlation=skip_origin_correlation,
        )

        records = list(remote_result.get("records", []))
        import_result = self.analysis.import_records(records=records, source_name=domain_controller)

        checkpoint_time = window_end
        latest_remote_time = remote_result.get("last_activity_time_utc")
        max_events_hit = bool(remote_result.get("max_events_hit"))
        if max_events_hit and latest_remote_time:
            checkpoint_time = self._parse_datetime(latest_remote_time)

        self.analysis.update_checkpoint(CHECKPOINT_TYPE, domain_controller, checkpoint_time)

        return {
            "domain_controller": domain_controller,
            "window_start_utc": self._to_utc_iso(window_start),
            "window_end_utc": self._to_utc_iso(window_end),
            "fetched_rows": len(records),
            "imported_rows": import_result["imported_rows"],
            "duplicate_rows": import_result["duplicate_rows"],
            "last_activity_time_utc": latest_remote_time,
            "max_events_hit": max_events_hit,
        }

    def _collect_via_winrm(
        self,
        domain_controller: str,
        start_time: datetime,
        end_time: datetime,
        skip_origin_correlation: bool,
    ) -> dict[str, Any]:
        try:
            from pypsrp.client import Client
        except ModuleNotFoundError as exc:
            raise RuntimeError("pypsrp is not installed. Install requirements.txt first.") from exc

        script = self._build_remote_script(
            start_time=start_time,
            end_time=end_time,
            max_records=self.settings.event_max_records_per_poll,
            skip_origin_correlation=skip_origin_correlation,
        )

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
        stdout, streams, had_errors = client.execute_ps(script)
        if had_errors:
            stream_text = self._format_psrp_streams(streams)
            detail = stream_text or stdout.strip() or "PowerShell returned errors with no message."
            raise RuntimeError(f"WinRM collection failed for {domain_controller}: {detail}")

        text = stdout.strip()
        if not text:
            return {"records": [], "last_activity_time_utc": None, "max_events_hit": False}
        payload = json.loads(text)
        if payload.get("remote_error"):
            detail = payload.get("remote_error")
            if payload.get("remote_error_detail"):
                detail = f"{detail} | {payload['remote_error_detail']}"
            raise RuntimeError(f"WinRM collection failed for {domain_controller}: {detail}")
        return payload

    def _build_remote_script(
        self,
        start_time: datetime,
        end_time: datetime,
        max_records: int,
        skip_origin_correlation: bool,
    ) -> str:
        start_iso = start_time.astimezone(timezone.utc).isoformat()
        end_iso = end_time.astimezone(timezone.utc).isoformat()
        event_ids = ",".join(str(event_id) for event_id in ACTION_EVENT_IDS)
        skip_origin_literal = "$true" if skip_origin_correlation else "$false"

        return f"""
try {{
$start = [datetimeoffset]::Parse('{start_iso}')
$end = [datetimeoffset]::Parse('{end_iso}')
$startZulu = $start.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$endZulu = $end.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$maxRecords = {max_records}
$eventIds = @({event_ids})
$eventIdPredicate = ($eventIds | ForEach-Object {{ "EventID=$_" }}) -join ' or '

function Get-EventDataMap {{
    param([System.Diagnostics.Eventing.Reader.EventRecord]$Event)
    $map = @{{}}
    $xml = [xml]$Event.ToXml()
    foreach ($node in @($xml.Event.EventData.Data)) {{
        $name = [string]$node.Name
        if ([string]::IsNullOrWhiteSpace($name)) {{
            continue
        }}
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

function Normalize-LogonId {{
    param([string]$LogonId)
    if ([string]::IsNullOrWhiteSpace($LogonId)) {{
        return ''
    }}
    return $LogonId.Trim().ToLowerInvariant()
}}

function Resolve-TargetNameFromDn {{
    param([string]$DistinguishedName)
    if ([string]::IsNullOrWhiteSpace($DistinguishedName)) {{
        return ''
    }}
    foreach ($part in $DistinguishedName.Split(',')) {{
        if ($part -like 'CN=*') {{
            return $part.Substring(3)
        }}
    }}
    return $DistinguishedName
}}

function Get-ObjectScope {{
    param([string]$ObjectClass, [string]$DistinguishedName)
    if ($ObjectClass -eq 'groupPolicyContainer' -or $DistinguishedName -like 'CN={{*}},CN=Policies,CN=System,*') {{
        return 'GPO'
    }}
    if ($ObjectClass -eq 'user') {{
        return 'User'
    }}
    if ($ObjectClass -eq 'group') {{
        return 'Group'
    }}
    if ($ObjectClass -eq 'computer') {{
        return 'Computer'
    }}
    if ($ObjectClass -eq 'organizationalUnit') {{
        return 'OU'
    }}
    if ($ObjectClass -in @('dnsNode', 'dnsZone')) {{
        return 'DNS'
    }}
    if (-not [string]::IsNullOrWhiteSpace($ObjectClass)) {{
        return 'Other'
    }}
    return 'Other'
}}

function New-EventFilterXml {{
    param(
        [string]$Path,
        [string]$Predicate,
        [string]$StartZulu,
        [string]$EndZulu
    )
    return @"
<QueryList>
  <Query Id="0" Path="$Path">
    <Select Path="$Path">*[System[($Predicate) and TimeCreated[@SystemTime&gt;='$StartZulu' and @SystemTime&lt;='$EndZulu']]]</Select>
  </Query>
</QueryList>
"@
}}

function Convert-ActionEvent {{
    param([System.Diagnostics.Eventing.Reader.EventRecord]$Event)

    $data = Get-EventDataMap -Event $Event
    $eventId = [int]$Event.Id
    $actor = Get-FirstField -Map $data -Names @('SubjectUserName')
    $actorDomain = Get-FirstField -Map $data -Names @('SubjectDomainName')
    if (-not [string]::IsNullOrWhiteSpace($actorDomain) -and -not [string]::IsNullOrWhiteSpace($actor)) {{
        $actor = "$actorDomain\\$actor"
    }}
    $subjectLogonId = Normalize-LogonId (Get-FirstField -Map $data -Names @('SubjectLogonId'))

    $base = [ordered]@{{
        activity_time_utc = $Event.TimeCreated.ToUniversalTime().ToString('o')
        domain_controller = $env:COMPUTERNAME
        event_id = $eventId
        event_record_id = [string]$Event.RecordId
        actor = $actor
        subject_user_name = Get-FirstField -Map $data -Names @('SubjectUserName')
        subject_domain_name = Get-FirstField -Map $data -Names @('SubjectDomainName')
        subject_logon_id = $subjectLogonId
        target_type = ''
        action = ''
        target_name = ''
        distinguished_name = ''
        object_class = ''
        attribute_name = ''
        attribute_operation = ''
        attribute_value = ''
        source_workstation = ''
        source_ip_address = ''
        source_port = ''
        logon_type = ''
        authentication = ''
    }}

    switch ($eventId) {{
        4720 {{
            $base.target_type = 'User'
            $base.action = 'Create'
            $base.target_name = Get-FirstField -Map $data -Names @('SamAccountName', 'TargetUserName')
        }}
        4726 {{
            $base.target_type = 'User'
            $base.action = 'Delete'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }}
        4738 {{
            $base.target_type = 'User'
            $base.action = 'Modify'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }}
        4741 {{
            $base.target_type = 'Computer'
            $base.action = 'Create'
            $base.target_name = Get-FirstField -Map $data -Names @('DnsHostName', 'SamAccountName', 'TargetUserName')
        }}
        4742 {{
            $base.target_type = 'Computer'
            $base.action = 'Modify'
            $base.target_name = Get-FirstField -Map $data -Names @('DnsHostName', 'SamAccountName', 'TargetUserName')
        }}
        4743 {{
            $base.target_type = 'Computer'
            $base.action = 'Delete'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }}
        5136 {{
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) {{ return $null }}
            $base.action = 'Modify'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
            $base.attribute_name = Get-FirstField -Map $data -Names @('AttributeLDAPDisplayName')
            $base.attribute_operation = Get-FirstField -Map $data -Names @('OperationType')
            $base.attribute_value = Get-FirstField -Map $data -Names @('AttributeValue')
        }}
        5137 {{
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) {{ return $null }}
            $base.action = 'Create'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
        }}
        5141 {{
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) {{ return $null }}
            $base.action = 'Delete'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
        }}
        default {{
            return $null
        }}
    }}

    return [pscustomobject]$base
}}

$actionEvents = @()
try {{
    $actionFilterXml = New-EventFilterXml -Path 'Security' -Predicate $eventIdPredicate -StartZulu $startZulu -EndZulu $endZulu
    $actionEvents = @(
        Get-WinEvent -FilterXml ([xml]$actionFilterXml) -MaxEvents $maxRecords -ErrorAction Stop |
        Sort-Object TimeCreated |
        Select-Object -First $maxRecords
    )
}}
catch [System.Exception] {{
    if ($_.FullyQualifiedErrorId -notlike '*NoMatchingEventsFound*' -and $_.FullyQualifiedErrorId -notlike '*ObjectNotFound*') {{
        throw
    }}
}}

$records = @()
$neededLogonIds = @{{}}
$logonQueryStart = $null
$logonQueryEnd = $null

foreach ($event in $actionEvents) {{
    $record = Convert-ActionEvent -Event $event
    if ($null -eq $record) {{
        continue
    }}

    $records += $record
    if (-not [string]::IsNullOrWhiteSpace($record.subject_logon_id)) {{
        $neededLogonIds[$record.subject_logon_id] = $true
        $candidateStart = $event.TimeCreated.AddHours(-12)
        $candidateEnd = $event.TimeCreated.AddMinutes(5)
        if ($null -eq $logonQueryStart -or $candidateStart -lt $logonQueryStart) {{ $logonQueryStart = $candidateStart }}
        if ($null -eq $logonQueryEnd -or $candidateEnd -gt $logonQueryEnd) {{ $logonQueryEnd = $candidateEnd }}
    }}
}}

$logonIndex = @{{}}
if (-not {skip_origin_literal} -and $neededLogonIds.Keys.Count -gt 0 -and $null -ne $logonQueryStart -and $null -ne $logonQueryEnd) {{
    $logonQueryStartZulu = $logonQueryStart.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    $logonQueryEndZulu = $logonQueryEnd.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    $logonEvents = @()
    try {{
        $logonFilterXml = New-EventFilterXml -Path 'Security' -Predicate 'EventID=4624' -StartZulu $logonQueryStartZulu -EndZulu $logonQueryEndZulu
        $logonEvents = Get-WinEvent -FilterXml ([xml]$logonFilterXml) -MaxEvents ([Math]::Max($maxRecords * 20, 5000)) -ErrorAction Stop
    }}
    catch [System.Exception] {{
        if ($_.FullyQualifiedErrorId -notlike '*NoMatchingEventsFound*' -and $_.FullyQualifiedErrorId -notlike '*ObjectNotFound*') {{
            throw
        }}
    }}
    foreach ($logonEvent in $logonEvents) {{
        $data = Get-EventDataMap -Event $logonEvent
        $targetLogonId = Normalize-LogonId (Get-FirstField -Map $data -Names @('TargetLogonId'))
        if ([string]::IsNullOrWhiteSpace($targetLogonId) -or -not $neededLogonIds.ContainsKey($targetLogonId)) {{
            continue
        }}
        if (-not $logonIndex.ContainsKey($targetLogonId)) {{
            $logonIndex[$targetLogonId] = @()
        }}
        $logonIndex[$targetLogonId] += [pscustomobject]@{{
            time_created_raw = $logonEvent.TimeCreated
            target_user_name = Get-FirstField -Map $data -Names @('TargetUserName')
            source_workstation = Get-FirstField -Map $data -Names @('WorkstationName')
            source_ip_address = Get-FirstField -Map $data -Names @('IpAddress')
            source_port = Get-FirstField -Map $data -Names @('IpPort')
            logon_type = Get-FirstField -Map $data -Names @('LogonType')
            authentication = Get-FirstField -Map $data -Names @('AuthenticationPackageName')
        }}
    }}
}}

foreach ($record in $records) {{
    if ([string]::IsNullOrWhiteSpace($record.subject_logon_id) -or -not $logonIndex.ContainsKey($record.subject_logon_id)) {{
        continue
    }}

    $activityTime = [datetimeoffset]::Parse($record.activity_time_utc).UtcDateTime
    $windowStart = $activityTime.AddHours(-12)
    $windowEnd = $activityTime.AddMinutes(5)
    foreach ($candidate in $logonIndex[$record.subject_logon_id]) {{
        if ($candidate.time_created_raw -lt $windowStart -or $candidate.time_created_raw -gt $windowEnd) {{
            continue
        }}
        if (-not [string]::IsNullOrWhiteSpace($record.subject_user_name) -and -not [string]::IsNullOrWhiteSpace($candidate.target_user_name)) {{
            if ($candidate.target_user_name -ne $record.subject_user_name) {{
                continue
            }}
        }}

        $record.source_workstation = $candidate.source_workstation
        $record.source_ip_address = $candidate.source_ip_address
        $record.source_port = $candidate.source_port
        $record.logon_type = $candidate.logon_type
        $record.authentication = $candidate.authentication
        break
    }}
}}

$lastActivity = $null
if ($records.Count -gt 0) {{
    $lastActivity = $records[$records.Count - 1].activity_time_utc
}}

[pscustomobject]@{{
    records = @($records)
    last_activity_time_utc = $lastActivity
    max_events_hit = ($actionEvents.Count -ge $maxRecords)
}} | ConvertTo-Json -Depth 8 -Compress
}}
catch {{
    [pscustomobject]@{{
        records = @()
        last_activity_time_utc = $null
        max_events_hit = $false
        remote_error = $_.Exception.Message
        remote_error_detail = $_.FullyQualifiedErrorId
        remote_script_stack = $_.ScriptStackTrace
    }} | ConvertTo-Json -Depth 8 -Compress
}}
""".strip()

    def _parse_datetime(self, value: str) -> datetime:
        normalized = normalize_iso_datetime(value)
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def _to_utc_iso(self, value: datetime) -> str:
        normalized = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
        return normalized.astimezone(timezone.utc).isoformat()

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

    def _format_psrp_streams(self, streams: Any) -> str:
        messages: list[str] = []
        for stream_name in ("error", "warning", "verbose", "debug"):
            for item in getattr(streams, stream_name, []) or []:
                message = getattr(item, "message", None)
                if message is None:
                    message = str(item)
                if message:
                    messages.append(f"{stream_name}: {message}")
        return " | ".join(messages)
