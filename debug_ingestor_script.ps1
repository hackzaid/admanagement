$start = [datetimeoffset]::Parse('2026-03-30T15:30:44.293411+00:00')
$end = [datetimeoffset]::Parse('2026-03-30T15:35:44.293411+00:00')
$maxRecords = 1000
$eventIds = @(4720,4726,4738,4741,4742,4743,5136,5137,5141)

function Get-EventDataMap {
    param([System.Diagnostics.Eventing.Reader.EventRecord]$Event)
    $map = @{}
    $xml = [xml]$Event.ToXml()
    foreach ($node in @($xml.Event.EventData.Data)) {
        $name = [string]$node.Name
        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }
        $map[$name] = [string]$node.'#text'
    }
    return $map
}

function Get-FirstField {
    param([hashtable]$Map, [string[]]$Names)
    foreach ($name in $Names) {
        if ($Map.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$name])) {
            return [string]$Map[$name]
        }
    }
    return ''
}

function Normalize-LogonId {
    param([string]$LogonId)
    if ([string]::IsNullOrWhiteSpace($LogonId)) {
        return ''
    }
    return $LogonId.Trim().ToLowerInvariant()
}

function Resolve-TargetNameFromDn {
    param([string]$DistinguishedName)
    if ([string]::IsNullOrWhiteSpace($DistinguishedName)) {
        return ''
    }
    foreach ($part in $DistinguishedName.Split(',')) {
        if ($part -like 'CN=*') {
            return $part.Substring(3)
        }
    }
    return $DistinguishedName
}

function Get-ObjectScope {
    param([string]$ObjectClass, [string]$DistinguishedName)
    if ($ObjectClass -eq 'groupPolicyContainer' -or $DistinguishedName -like 'CN={*},CN=Policies,CN=System,*') {
        return 'GPO'
    }
    if ($ObjectClass -eq 'user') {
        return 'User'
    }
    if ($ObjectClass -eq 'computer') {
        return 'Computer'
    }
    return ''
}

function Convert-ActionEvent {
    param([System.Diagnostics.Eventing.Reader.EventRecord]$Event)

    $data = Get-EventDataMap -Event $Event
    $eventId = [int]$Event.Id
    $actor = Get-FirstField -Map $data -Names @('SubjectUserName')
    $actorDomain = Get-FirstField -Map $data -Names @('SubjectDomainName')
    if (-not [string]::IsNullOrWhiteSpace($actorDomain) -and -not [string]::IsNullOrWhiteSpace($actor)) {
        $actor = "$actorDomain\$actor"
    }
    $subjectLogonId = Normalize-LogonId (Get-FirstField -Map $data -Names @('SubjectLogonId'))

    $base = [ordered]@{
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
    }

    switch ($eventId) {
        4720 {
            $base.target_type = 'User'
            $base.action = 'Create'
            $base.target_name = Get-FirstField -Map $data -Names @('SamAccountName', 'TargetUserName')
        }
        4726 {
            $base.target_type = 'User'
            $base.action = 'Delete'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }
        4738 {
            $base.target_type = 'User'
            $base.action = 'Modify'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }
        4741 {
            $base.target_type = 'Computer'
            $base.action = 'Create'
            $base.target_name = Get-FirstField -Map $data -Names @('DnsHostName', 'SamAccountName', 'TargetUserName')
        }
        4742 {
            $base.target_type = 'Computer'
            $base.action = 'Modify'
            $base.target_name = Get-FirstField -Map $data -Names @('DnsHostName', 'SamAccountName', 'TargetUserName')
        }
        4743 {
            $base.target_type = 'Computer'
            $base.action = 'Delete'
            $base.target_name = Get-FirstField -Map $data -Names @('TargetUserName', 'SamAccountName')
        }
        5136 {
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) { return $null }
            $base.action = 'Modify'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
            $base.attribute_name = Get-FirstField -Map $data -Names @('AttributeLDAPDisplayName')
            $base.attribute_operation = Get-FirstField -Map $data -Names @('OperationType')
            $base.attribute_value = Get-FirstField -Map $data -Names @('AttributeValue')
        }
        5137 {
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) { return $null }
            $base.action = 'Create'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
        }
        5141 {
            $base.distinguished_name = Get-FirstField -Map $data -Names @('ObjectDN')
            $base.object_class = Get-FirstField -Map $data -Names @('ObjectClass')
            $base.target_type = Get-ObjectScope -ObjectClass $base.object_class -DistinguishedName $base.distinguished_name
            if ([string]::IsNullOrWhiteSpace($base.target_type)) { return $null }
            $base.action = 'Delete'
            $base.target_name = Resolve-TargetNameFromDn -DistinguishedName $base.distinguished_name
        }
        default {
            return $null
        }
    }

    return [pscustomobject]$base
}

$actionEvents = @(
    Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = $eventIds; StartTime = $start.UtcDateTime; EndTime = $end.UtcDateTime } -ErrorAction Stop |
    Sort-Object TimeCreated |
    Select-Object -First $maxRecords
)

$records = New-Object System.Collections.Generic.List[object]
$neededLogonIds = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$logonQueryStart = $null
$logonQueryEnd = $null

foreach ($event in $actionEvents) {
    $record = Convert-ActionEvent -Event $event
    if ($null -eq $record) {
        continue
    }

    [void]$records.Add($record)
    if (-not [string]::IsNullOrWhiteSpace($record.subject_logon_id)) {
        [void]$neededLogonIds.Add($record.subject_logon_id)
        $candidateStart = $event.TimeCreated.AddHours(-12)
        $candidateEnd = $event.TimeCreated.AddMinutes(5)
        if ($null -eq $logonQueryStart -or $candidateStart -lt $logonQueryStart) { $logonQueryStart = $candidateStart }
        if ($null -eq $logonQueryEnd -or $candidateEnd -gt $logonQueryEnd) { $logonQueryEnd = $candidateEnd }
    }
}

$logonIndex = @{}
if ($neededLogonIds.Count -gt 0 -and $null -ne $logonQueryStart -and $null -ne $logonQueryEnd) {
    $logonEvents = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4624; StartTime = $logonQueryStart; EndTime = $logonQueryEnd } -ErrorAction Stop
    foreach ($logonEvent in $logonEvents) {
        $data = Get-EventDataMap -Event $logonEvent
        $targetLogonId = Normalize-LogonId (Get-FirstField -Map $data -Names @('TargetLogonId'))
        if ([string]::IsNullOrWhiteSpace($targetLogonId) -or -not $neededLogonIds.Contains($targetLogonId)) {
            continue
        }
        if (-not $logonIndex.ContainsKey($targetLogonId)) {
            $logonIndex[$targetLogonId] = New-Object System.Collections.Generic.List[object]
        }
        [void]$logonIndex[$targetLogonId].Add([pscustomobject]@{
            time_created_raw = $logonEvent.TimeCreated
            target_user_name = Get-FirstField -Map $data -Names @('TargetUserName')
            source_workstation = Get-FirstField -Map $data -Names @('WorkstationName')
            source_ip_address = Get-FirstField -Map $data -Names @('IpAddress')
            source_port = Get-FirstField -Map $data -Names @('IpPort')
            logon_type = Get-FirstField -Map $data -Names @('LogonType')
            authentication = Get-FirstField -Map $data -Names @('AuthenticationPackageName')
        })
    }
}

foreach ($record in $records) {
    if ([string]::IsNullOrWhiteSpace($record.subject_logon_id) -or -not $logonIndex.ContainsKey($record.subject_logon_id)) {
        continue
    }

    $activityTime = [datetimeoffset]::Parse($record.activity_time_utc).UtcDateTime
    $windowStart = $activityTime.AddHours(-12)
    $windowEnd = $activityTime.AddMinutes(5)
    foreach ($candidate in $logonIndex[$record.subject_logon_id]) {
        if ($candidate.time_created_raw -lt $windowStart -or $candidate.time_created_raw -gt $windowEnd) {
            continue
        }
        if (-not [string]::IsNullOrWhiteSpace($record.subject_user_name) -and -not [string]::IsNullOrWhiteSpace($candidate.target_user_name)) {
            if ($candidate.target_user_name -ne $record.subject_user_name) {
                continue
            }
        }

        $record.source_workstation = $candidate.source_workstation
        $record.source_ip_address = $candidate.source_ip_address
        $record.source_port = $candidate.source_port
        $record.logon_type = $candidate.logon_type
        $record.authentication = $candidate.authentication
        break
    }
}

$lastActivity = $null
if ($records.Count -gt 0) {
    $lastActivity = $records[$records.Count - 1].activity_time_utc
}

[pscustomobject]@{
    records = @($records)
    last_activity_time_utc = $lastActivity
    max_events_hit = ($actionEvents.Count -ge $maxRecords)
} | ConvertTo-Json -Depth 8 -Compress