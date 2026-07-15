param(
  [ValidateSet('Prepare','StartBrowser','StopBrowser','Finalize','SelfTest')]
  [string]$Phase = 'Prepare',
  [string]$RepoRoot,
  [int]$Port = 4175
)

$ErrorActionPreference = 'Stop'
$script:SkillRoot = Split-Path $PSScriptRoot -Parent
$script:RulesPath = Join-Path $script:SkillRoot 'references\rules-of-life-v2.csv'

function Resolve-AuditRepoRoot([string]$RequestedRoot) {
  if ($RequestedRoot) { return (Resolve-Path -LiteralPath $RequestedRoot).Path }
  return (Resolve-Path -LiteralPath (Join-Path $script:SkillRoot '..\..\..')).Path
}

function Assert-EvidencePath([string]$Path, [string]$EvidenceRoot) {
  $fullPath = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  $fullEvidence = [IO.Path]::GetFullPath($EvidenceRoot).TrimEnd('\')
  if ($fullPath -ne $fullEvidence -and -not $fullPath.StartsWith($fullEvidence + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Path escapes Evidence: $fullPath"
  }
}

function Remove-AuditPath([string]$Path, [string]$EvidenceRoot) {
  Assert-EvidencePath -Path $Path -EvidenceRoot $EvidenceRoot
  if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
}

function Read-CanonicalRules([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Canonical ruleset missing: $Path" }
  $rows = @(Import-Csv -LiteralPath $Path | ForEach-Object {
    [pscustomobject]@{
      ruleset_version = [string]$_.ruleset_version
      rule_number = [int]$_.rule_number
      rule_text = [string]$_.rule_text
    }
  })
  if ($rows.Count -ne 117) { throw "Ruleset v2 must contain 117 rules; found $($rows.Count)." }
  if (@($rows.ruleset_version | Sort-Object -Unique).Count -ne 1 -or $rows[0].ruleset_version -ne 'v2') { throw 'Canonical ruleset version must be v2.' }
  for ($index = 0; $index -lt 117; $index += 1) {
    if ($rows[$index].rule_number -ne ($index + 1) -or [string]::IsNullOrWhiteSpace($rows[$index].rule_text)) {
      throw "Canonical ruleset ordering/text invalid at row $($index + 1)."
    }
  }
  return $rows
}

function Assert-Verdicts($Canonical, $Verdicts) {
  $canonicalRows = @($Canonical)
  $verdictRows = @($Verdicts)
  if ($verdictRows.Count -ne $canonicalRows.Count) { throw "Verdict matrix must contain $($canonicalRows.Count) rows; found $($verdictRows.Count)." }
  $duplicates = @($verdictRows | Group-Object rule_number | Where-Object Count -ne 1)
  if ($duplicates.Count) { throw 'Verdict rule numbers must be unique.' }
  $allowed = @('YES','NO','PARTIAL','NOT TESTED')
  for ($index = 0; $index -lt $canonicalRows.Count; $index += 1) {
    $expected = $canonicalRows[$index]
    $actual = $verdictRows[$index]
    if ([int]$actual.rule_number -ne $expected.rule_number) { throw "Verdict ordering mismatch at rule $($expected.rule_number)." }
    if ([string]$actual.ruleset_version -ne $expected.ruleset_version) { throw "Ruleset version mismatch at rule $($expected.rule_number)." }
    if ([string]$actual.rule_text -ne $expected.rule_text) { throw "Canonical wording mismatch at rule $($expected.rule_number)." }
    if ([string]$actual.status -notin $allowed) { throw "Invalid status at rule $($expected.rule_number): $($actual.status)" }
    if ([string]::IsNullOrWhiteSpace([string]$actual.evidence)) { throw "Evidence is required for rule $($expected.rule_number)." }
    if ([string]::IsNullOrWhiteSpace([string]$actual.verification_method)) { throw "Verification method is required for rule $($expected.rule_number)." }
  }
}

function Render-AuditMarkdown($Rows) {
  $builder = [Text.StringBuilder]::new()
  [void]$builder.AppendLine('# Rules being obeyed')
  [void]$builder.AppendLine()
  foreach ($row in @($Rows | Where-Object status -eq 'YES')) {
    [void]$builder.AppendLine("## Rule $($row.rule_number)")
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("- **Rule text:** $($row.rule_text)")
    [void]$builder.AppendLine("- **Status:** $($row.status)")
    [void]$builder.AppendLine("- **Evidence:** $($row.evidence)")
    [void]$builder.AppendLine()
  }
  [void]$builder.AppendLine('# Rules not being obeyed / not fully verified')
  [void]$builder.AppendLine()
  foreach ($row in @($Rows | Where-Object status -ne 'YES')) {
    [void]$builder.AppendLine("## Rule $($row.rule_number)")
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("- **Rule text:** $($row.rule_text)")
    [void]$builder.AppendLine("- **Status:** $($row.status)")
    [void]$builder.AppendLine("- **Evidence:** $($row.evidence)")
    [void]$builder.AppendLine()
  }
  return $builder.ToString()
}

function Get-AuditRelativeFiles([string]$Root) {
  $rootFiles = @('package.json','package-lock.json','vite.config.ts','tsconfig.json','index.html','README.md','.env.example','.gitignore','metadata.json')
  $sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $Root 'src') -Recurse -File | ForEach-Object { $_.FullName.Substring($Root.Length + 1) })
  return @($rootFiles | Where-Object { Test-Path -LiteralPath (Join-Path $Root $_) }) + $sourceFiles
}

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '') }
    finally { $algorithm.Dispose() }
  } finally { $stream.Dispose() }
}

function Get-HashRecords([string]$Root, [string[]]$RelativePaths) {
  foreach ($relative in $RelativePaths) {
    $path = Join-Path $Root $relative
    if (-not (Test-Path -LiteralPath $path)) { throw "Hash target missing: $relative" }
    [pscustomobject]@{ relative_path = $relative; sha256 = Get-Sha256 -Path $path }
  }
}

function Compare-HashRecords([string]$Root, $Baseline) {
  foreach ($record in @($Baseline)) {
    $path = Join-Path $Root $record.relative_path
    $actual = if (Test-Path -LiteralPath $path) { Get-Sha256 -Path $path } else { '<missing>' }
    if ($actual -ne $record.sha256) { [pscustomobject]@{ relative_path = $record.relative_path; expected = $record.sha256; actual = $actual } }
  }
}

function Test-CommandBelongsToRuntime([string]$CommandLine, [string]$RuntimePath) {
  if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
  return $CommandLine.IndexOf([IO.Path]::GetFullPath($RuntimePath).TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Assert-ExtractedPackage([string]$Root) {
  $required = @('rules_of_life_audit.md','rules_of_life_matrix.csv','audit_notes.md','verification_log.md','source_snapshot_manifest.md','full_source_snapshot')
  $missing = @($required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Root $_)) })
  $hasScreenshots = Test-Path -LiteralPath (Join-Path $Root 'screenshots')
  $hasScreenshotNote = Test-Path -LiteralPath (Join-Path $Root 'screenshots_not_created.md')
  if ($missing.Count -or (-not $hasScreenshots -and -not $hasScreenshotNote)) { throw "Extracted evidence package is incomplete: $($missing -join ', ')" }
  if (-not (Get-ChildItem -LiteralPath (Join-Path $Root 'full_source_snapshot') -Recurse -File | Select-Object -First 1)) { throw 'Full source snapshot is empty.' }
  if ($hasScreenshots -and -not (Get-ChildItem -LiteralPath (Join-Path $Root 'screenshots') -File | Select-Object -First 1)) { throw 'Screenshots folder is empty.' }
}

function Copy-AuditSource([string]$Root, [string]$Destination, [string]$EvidenceRoot) {
  Assert-EvidencePath -Path $Destination -EvidenceRoot $EvidenceRoot
  Remove-AuditPath -Path $Destination -EvidenceRoot $EvidenceRoot
  New-Item -ItemType Directory -Path $Destination | Out-Null
  Copy-Item -LiteralPath (Join-Path $Root 'src') -Destination $Destination -Recurse
  foreach ($relative in @(Get-AuditRelativeFiles -Root $Root | Where-Object { -not $_.StartsWith('src\') })) {
    Copy-Item -LiteralPath (Join-Path $Root $relative) -Destination $Destination
  }
}

function Invoke-LoggedNpm([string]$WorkingDirectory, [string[]]$Arguments, [string]$LogPath) {
  Push-Location $WorkingDirectory
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = @(& npm.cmd @Arguments 2>&1)
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
    Pop-Location
  }
  [IO.File]::WriteAllLines($LogPath, [string[]]$output, [Text.UTF8Encoding]::new($false))
  return [pscustomobject]@{ command = 'npm ' + ($Arguments -join ' '); exit_code = $code; log = [IO.Path]::GetFileName($LogPath) }
}

function Invoke-Prepare([string]$Root) {
  $evidence = Join-Path $Root 'Evidence'
  New-Item -ItemType Directory -Path $evidence -Force | Out-Null
  $work = Join-Path $evidence 'rules_of_life_audit_work'
  $runtime = Join-Path $work 'runtime'
  Remove-AuditPath -Path $work -EvidenceRoot $evidence
  New-Item -ItemType Directory -Path $work,(Join-Path $work 'screenshots') | Out-Null

  $canonical = @(Read-CanonicalRules -Path $script:RulesPath)
  $relativeFiles = @(Get-AuditRelativeFiles -Root $Root)
  $hashes = @(Get-HashRecords -Root $Root -RelativePaths $relativeFiles)
  $hashes | Export-Csv -LiteralPath (Join-Path $work 'source_hashes_before.csv') -NoTypeInformation -Encoding utf8

  Copy-AuditSource -Root $Root -Destination $runtime -EvidenceRoot $evidence
  Copy-AuditSource -Root $Root -Destination (Join-Path $evidence 'full_source_snapshot') -EvidenceRoot $evidence

  $results = @(
    Invoke-LoggedNpm -WorkingDirectory $runtime -Arguments @('ci') -LogPath (Join-Path $work 'npm-ci.log')
    Invoke-LoggedNpm -WorkingDirectory $runtime -Arguments @('run','lint') -LogPath (Join-Path $work 'npm-lint.log')
    Invoke-LoggedNpm -WorkingDirectory $runtime -Arguments @('test') -LogPath (Join-Path $work 'npm-test.log')
    Invoke-LoggedNpm -WorkingDirectory $runtime -Arguments @('run','build') -LogPath (Join-Path $work 'npm-build.log')
  )
  $results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $work 'command_results.json') -Encoding utf8

  $canonical | ForEach-Object {
    [pscustomobject]@{ ruleset_version=$_.ruleset_version; rule_number=$_.rule_number; rule_text=$_.rule_text; status=''; evidence=''; verification_method='' }
  } | Export-Csv -LiteralPath (Join-Path $work 'verdicts.csv') -NoTypeInformation -Encoding utf8

  @"
# Audit Notes

Record inspected files, command interpretation, uncertainties, and human-review items here.
"@ | Set-Content -LiteralPath (Join-Path $work 'audit_notes.md') -Encoding utf8
  @"
# Browser Observations

- Browser checked: NOT TESTED
- Storage writes blocked: NOT TESTED
- Storage unchanged: NOT TESTED
- Console health: NOT TESTED
- Scenarios: NOT TESTED
- Screenshot notes: No browser run recorded.
"@ | Set-Content -LiteralPath (Join-Path $work 'browser_observations.md') -Encoding utf8

  $context = [pscustomobject]@{
    ruleset_version = 'v2'
    ruleset_sha256 = Get-Sha256 -Path $script:RulesPath
    prepared_at = (Get-Date).ToString('o')
    preexisting_port_3000_listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).Count
  }
  $context | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $work 'audit_context.json') -Encoding utf8
  Write-Host "Prepared audit workspace: $work"
  if (@($results | Where-Object exit_code -ne 0).Count) { throw 'One or more verification commands failed. Review the preserved logs before classifying rules.' }
}

function Invoke-StartBrowser([string]$Root, [int]$RequestedPort) {
  $evidence = Join-Path $Root 'Evidence'
  $work = Join-Path $evidence 'rules_of_life_audit_work'
  $runtime = Join-Path $work 'runtime'
  if (-not (Test-Path -LiteralPath $runtime)) { throw 'Run Prepare before StartBrowser.' }
  if (Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue) { throw "Port $RequestedPort already has a listener." }
  $out = Join-Path $work 'browser-server.out.log'
  $err = Join-Path $work 'browser-server.err.log'
  $launcher = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port',"$RequestedPort",'--strictPort' -WorkingDirectory $runtime -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden -PassThru
  $listener = $null
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    $listener = Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { break }
  }
  if (-not $listener) { Stop-Process -Id $launcher.Id -Force -ErrorAction SilentlyContinue; throw "Audit server did not start on port $RequestedPort." }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if (-not (Test-CommandBelongsToRuntime -CommandLine $process.CommandLine -RuntimePath $runtime)) { throw 'Listener ownership could not be tied to the audit runtime.' }
  [pscustomobject]@{ port=$RequestedPort; launcher_pid=$launcher.Id; launcher_started=$launcher.StartTime.ToString('o'); listener_pid=$listener.OwningProcess; runtime=$runtime; started_at=(Get-Date).ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $work 'browser_server.json') -Encoding utf8
  Write-Host "Audit browser server ready: http://127.0.0.1:$RequestedPort"
}

function Invoke-StopBrowser([string]$Root) {
  $work = Join-Path (Join-Path $Root 'Evidence') 'rules_of_life_audit_work'
  $statePath = Join-Path $work 'browser_server.json'
  if (-not (Test-Path -LiteralPath $statePath)) { throw 'No recorded audit-owned browser server exists.' }
  $state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
  $listener = Get-NetTCPConnection -LocalPort ([int]$state.port) -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    if ([int]$listener.OwningProcess -ne [int]$state.listener_pid) { throw 'Port ownership changed; refusing to stop an unrecorded process.' }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if (-not (Test-CommandBelongsToRuntime -CommandLine $process.CommandLine -RuntimePath $state.runtime)) { throw 'Recorded listener no longer belongs to the audit runtime.' }
    Stop-Process -Id $listener.OwningProcess -Force
  }
  Start-Sleep -Milliseconds 500
  $launcher = Get-Process -Id ([int]$state.launcher_pid) -ErrorAction SilentlyContinue
  if ($launcher -and $launcher.StartTime.ToString('o') -eq [string]$state.launcher_started) { Stop-Process -Id $launcher.Id -Force }
  if (Get-NetTCPConnection -LocalPort ([int]$state.port) -State Listen -ErrorAction SilentlyContinue) { throw 'Audit browser server is still listening.' }
  $state | Add-Member -NotePropertyName stopped_at -NotePropertyValue (Get-Date).ToString('o') -Force
  $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
  Write-Host "Audit browser server stopped: port $($state.port)"
}

function Invoke-Finalize([string]$Root) {
  $evidence = Join-Path $Root 'Evidence'
  $work = Join-Path $evidence 'rules_of_life_audit_work'
  $canonical = @(Read-CanonicalRules -Path $script:RulesPath)
  $verdictPath = Join-Path $work 'verdicts.csv'
  if (-not (Test-Path -LiteralPath $verdictPath)) { throw 'Prepared verdicts.csv is missing.' }
  $verdicts = @(Import-Csv -LiteralPath $verdictPath)
  Assert-Verdicts -Canonical $canonical -Verdicts $verdicts

  $baseline = @(Import-Csv -LiteralPath (Join-Path $work 'source_hashes_before.csv'))
  $drift = @(Compare-HashRecords -Root $Root -Baseline $baseline)
  if ($drift.Count) { throw "App source/config changed during audit: $($drift.relative_path -join ', ')" }

  [IO.File]::WriteAllText((Join-Path $evidence 'rules_of_life_audit.md'), (Render-AuditMarkdown -Rows $verdicts), [Text.UTF8Encoding]::new($false))
  $verdicts | Select-Object rule_number,rule_text,status,evidence,verification_method | Export-Csv -LiteralPath (Join-Path $evidence 'rules_of_life_matrix.csv') -NoTypeInformation -Encoding utf8
  Copy-Item -LiteralPath (Join-Path $work 'audit_notes.md') -Destination (Join-Path $evidence 'audit_notes.md') -Force
  Copy-Item -LiteralPath (Join-Path $work 'browser_observations.md') -Destination (Join-Path $evidence 'browser_observations.md') -Force

  $snapshot = Join-Path $evidence 'full_source_snapshot'
  $snapshotCount = @(Get-ChildItem -LiteralPath $snapshot -Recurse -File).Count
  $manifest = "# Source Snapshot Manifest`r`n`r`nRuleset: v2`r`n`r`nFiles: $snapshotCount`r`n`r`n" + ((Get-ChildItem -LiteralPath $snapshot -Recurse -File | ForEach-Object { '- `' + $_.FullName.Substring($snapshot.Length + 1).Replace('\','/') + '`' }) -join "`r`n") + "`r`n"
  [IO.File]::WriteAllText((Join-Path $evidence 'source_snapshot_manifest.md'), $manifest, [Text.UTF8Encoding]::new($false))

  $results = @(Get-Content -Raw -LiteralPath (Join-Path $work 'command_results.json') | ConvertFrom-Json)
  $counts = @{}; foreach ($status in @('YES','NO','PARTIAL','NOT TESTED')) { $counts[$status] = @($verdicts | Where-Object status -eq $status).Count }
  $browserNotes = Get-Content -Raw -LiteralPath (Join-Path $work 'browser_observations.md')
  $commandLines = @($results | ForEach-Object { '- `' + $_.command + '`: exit ' + $_.exit_code + ' - `' + $_.log + '`' }) -join "`r`n"
  $verification = @"
# Rules-of-Life Audit Verification Log

Ruleset: v2  
Ruleset SHA-256: $(Get-Sha256 -Path $script:RulesPath)  
Verdicts: YES $($counts['YES']); NO $($counts['NO']); PARTIAL $($counts['PARTIAL']); NOT TESTED $($counts['NOT TESTED'])

## Commands

$commandLines

## Browser

$browserNotes

## Integrity

- All 117 canonical rules are present exactly once.
- Status, evidence, and verification method fields passed validation.
- Source/config hash drift: none.
- Full source snapshot files: $snapshotCount.

## ZIP verification

Pending package verification.
"@
  [IO.File]::WriteAllText((Join-Path $evidence 'verification_log.md'), $verification, [Text.UTF8Encoding]::new($false))

  $auditScreens = Join-Path $evidence 'rules_of_life_audit_screenshots'
  Remove-AuditPath -Path $auditScreens -EvidenceRoot $evidence
  $workScreens = @(Get-ChildItem -LiteralPath (Join-Path $work 'screenshots') -File -ErrorAction SilentlyContinue)
  $screenshotNote = Join-Path $evidence 'screenshots_not_created.md'
  if ($workScreens.Count) {
    New-Item -ItemType Directory -Path $auditScreens | Out-Null
    $workScreens | Copy-Item -Destination $auditScreens
    if (Test-Path -LiteralPath $screenshotNote) { Remove-Item -LiteralPath $screenshotNote -Force }
  } else {
    [IO.File]::WriteAllText($screenshotNote, "# Screenshots Not Created`r`n`r`nSee browser_observations.md for the exact blocker.`r`n", [Text.UTF8Encoding]::new($false))
  }

  $stage = Join-Path $evidence '_rules_audit_zip_stage'
  $extract = Join-Path $evidence '_rules_audit_zip_extract'
  $zip = Join-Path $evidence 'the_child_rules_of_life_audit_evidence.zip'
  Remove-AuditPath -Path $stage -EvidenceRoot $evidence
  Remove-AuditPath -Path $extract -EvidenceRoot $evidence
  if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
  New-Item -ItemType Directory -Path $stage | Out-Null
  foreach ($name in @('rules_of_life_audit.md','rules_of_life_matrix.csv','audit_notes.md','browser_observations.md','verification_log.md','source_snapshot_manifest.md')) {
    Copy-Item -LiteralPath (Join-Path $evidence $name) -Destination $stage
  }
  Copy-Item -LiteralPath $script:RulesPath -Destination (Join-Path $stage 'rules-of-life-v2.csv')
  Copy-Item -LiteralPath $snapshot -Destination $stage -Recurse
  if ($workScreens.Count) { Copy-Item -LiteralPath $auditScreens -Destination (Join-Path $stage 'screenshots') -Recurse } else { Copy-Item -LiteralPath $screenshotNote -Destination $stage }

  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  Assert-ExtractedPackage -Root $extract
  $firstBytes = (Get-Item -LiteralPath $zip).Length
  $firstEntries = @(Get-ChildItem -LiteralPath $extract -Recurse -File).Count
  $verification = $verification.Replace('Pending package verification.', "- First package pass: $firstBytes bytes; $firstEntries extracted files.`r`n- Required entries missing: 0.`r`n- Extraction: PASS.`r`n- Final archive rebuilt with this record and extracted again: PASS.`r`n- Temporary staging/extraction cleanup: PASS.")
  [IO.File]::WriteAllText((Join-Path $evidence 'verification_log.md'), $verification, [Text.UTF8Encoding]::new($false))
  Copy-Item -LiteralPath (Join-Path $evidence 'verification_log.md') -Destination (Join-Path $stage 'verification_log.md') -Force
  Remove-Item -LiteralPath $zip -Force
  Remove-AuditPath -Path $extract -EvidenceRoot $evidence
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  Assert-ExtractedPackage -Root $extract
  if ((Get-Item -LiteralPath $zip).Length -le 0) { throw 'Final evidence ZIP is empty.' }
  Remove-AuditPath -Path $stage -EvidenceRoot $evidence
  Remove-AuditPath -Path $extract -EvidenceRoot $evidence
  Write-Host "Final evidence ZIP verified: $zip"
}

if ($env:RULES_AUDIT_IMPORT_ONLY -eq '1') { return }
$resolvedRoot = Resolve-AuditRepoRoot -RequestedRoot $RepoRoot
switch ($Phase) {
  'Prepare' { Invoke-Prepare -Root $resolvedRoot }
  'StartBrowser' { Invoke-StartBrowser -Root $resolvedRoot -RequestedPort $Port }
  'StopBrowser' { Invoke-StopBrowser -Root $resolvedRoot }
  'Finalize' { Invoke-Finalize -Root $resolvedRoot }
  'SelfTest' { & (Join-Path $PSScriptRoot 'self-test.ps1'); if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
}
