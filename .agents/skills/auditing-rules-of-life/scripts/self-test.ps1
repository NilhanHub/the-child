$ErrorActionPreference = 'Stop'

$skillRoot = Split-Path $PSScriptRoot -Parent
$harnessPath = Join-Path $PSScriptRoot 'audit-harness.ps1'
$rulesPath = Join-Path $skillRoot 'references\rules-of-life-v2.csv'
$browserProtocolPath = Join-Path $skillRoot 'references\browser-verification.md'
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { $script:failures.Add($message) }
}

function Assert-Throws([scriptblock]$action, [string]$message) {
  try {
    & $action
    $script:failures.Add($message)
  } catch { }
}

Assert-True (Test-Path -LiteralPath $harnessPath) 'audit-harness.ps1 must exist.'
Assert-True (Test-Path -LiteralPath $rulesPath) 'rules-of-life-v2.csv must exist.'
Assert-True (Test-Path -LiteralPath $browserProtocolPath) 'browser-verification.md must exist.'

if (Test-Path -LiteralPath $browserProtocolPath) {
  $browserProtocol = Get-Content -LiteralPath $browserProtocolPath -Raw
  Assert-True ($browserProtocol -match 'Current Run Summary') 'Browser protocol must verify Current Run Summary.'
  Assert-True ($browserProtocol -match 'Dry Run: Memory Search Plan') 'Browser protocol must verify the dry-run panel.'
  Assert-True ($browserProtocol -match 'Last Run Report') 'Browser protocol must verify Last Run Report.'
}

if (-not $failures.Count) {
  $env:RULES_AUDIT_IMPORT_ONLY = '1'
  . $harnessPath
  Remove-Item Env:RULES_AUDIT_IMPORT_ONLY

  $canonical = @(Read-CanonicalRules -Path $rulesPath)
  Assert-True ($canonical.Count -eq 117) 'Canonical ruleset must contain 117 rules.'
  Assert-True (@($canonical.rule_number | Sort-Object -Unique).Count -eq 117) 'Canonical rule numbers must be unique.'
  $versions = @($canonical.ruleset_version | Sort-Object -Unique)
  Assert-True ($versions.Count -eq 1 -and $versions[0] -eq 'v2') 'Canonical ruleset version must be v2.'

  $valid = @($canonical | ForEach-Object {
    [pscustomobject]@{
      ruleset_version = $_.ruleset_version
      rule_number = $_.rule_number
      rule_text = $_.rule_text
      status = 'YES'
      evidence = 'Verified evidence.'
      verification_method = 'Contract test.'
    }
  })
  Assert-Verdicts -Canonical $canonical -Verdicts $valid

  $missing = @($valid | Select-Object -Skip 1)
  Assert-Throws { Assert-Verdicts -Canonical $canonical -Verdicts $missing } 'Missing rules must fail validation.'

  $duplicate = @($valid + $valid[0])
  Assert-Throws { Assert-Verdicts -Canonical $canonical -Verdicts $duplicate } 'Duplicate rules must fail validation.'

  $invalidStatus = @($valid | ForEach-Object { $_ | Select-Object * })
  $invalidStatus[0].status = 'MAYBE'
  Assert-Throws { Assert-Verdicts -Canonical $canonical -Verdicts $invalidStatus } 'Invalid statuses must fail validation.'

  $blankEvidence = @($valid | ForEach-Object { $_ | Select-Object * })
  $blankEvidence[0].evidence = ''
  Assert-Throws { Assert-Verdicts -Canonical $canonical -Verdicts $blankEvidence } 'Blank evidence must fail validation.'

  $changedText = @($valid | ForEach-Object { $_ | Select-Object * })
  $changedText[0].rule_text = 'Changed rule text.'
  Assert-Throws { Assert-Verdicts -Canonical $canonical -Verdicts $changedText } 'Changed canonical wording must fail validation.'

  $markdown = Render-AuditMarkdown -Rows $valid
  Assert-True (([regex]::Matches($markdown, '(?m)^# ')).Count -eq 2) 'Audit Markdown must contain exactly two level-one headings.'
  Assert-True (([regex]::Matches($markdown, '(?m)^## Rule \d+\r?$')).Count -eq 117) 'Audit Markdown must contain every rule exactly once.'

  $sandbox = Join-Path ([IO.Path]::GetTempPath()) ('rules-audit-self-test-' + [guid]::NewGuid())
  $evidence = Join-Path $sandbox 'Evidence'
  New-Item -ItemType Directory -Path $evidence | Out-Null
  try {
    Assert-EvidencePath -Path (Join-Path $evidence 'inside') -EvidenceRoot $evidence
    Assert-Throws { Assert-EvidencePath -Path (Join-Path $sandbox 'outside') -EvidenceRoot $evidence } 'Paths outside Evidence must be rejected.'
    Assert-True (Test-CommandBelongsToRuntime -CommandLine 'node C:\fixture\runtime\node_modules\vite\bin\vite.js' -RuntimePath 'C:\fixture\runtime') 'Matching server command must pass ownership validation.'
    Assert-True (-not (Test-CommandBelongsToRuntime -CommandLine 'node C:\other\vite.js' -RuntimePath 'C:\fixture\runtime')) 'Unrelated server command must fail ownership validation.'

    $hashFile = Join-Path $sandbox 'hash.txt'
    [IO.File]::WriteAllText($hashFile, 'before')
    $baseline = @(Get-HashRecords -Root $sandbox -RelativePaths @('hash.txt'))
    [IO.File]::WriteAllText($hashFile, 'after')
    Assert-True (@(Compare-HashRecords -Root $sandbox -Baseline $baseline).Count -eq 1) 'Source hash drift must be detected.'

    $package = Join-Path $sandbox 'package'
    New-Item -ItemType Directory -Path (Join-Path $package 'screenshots'),(Join-Path $package 'full_source_snapshot') | Out-Null
    @('rules_of_life_audit.md','rules_of_life_matrix.csv','audit_notes.md','verification_log.md','source_snapshot_manifest.md') | ForEach-Object {
      [IO.File]::WriteAllText((Join-Path $package $_), 'fixture')
    }
    [IO.File]::WriteAllText((Join-Path $package 'screenshots\one.png'), 'fixture')
    [IO.File]::WriteAllText((Join-Path $package 'full_source_snapshot\one.ts'), 'fixture')
    Assert-ExtractedPackage -Root $package
    Remove-Item -LiteralPath (Join-Path $package 'verification_log.md')
    Assert-Throws { Assert-ExtractedPackage -Root $package } 'Missing mandatory ZIP entries must fail validation.'
  } finally {
    Remove-Item -LiteralPath $sandbox -Recurse -Force
  }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host 'Rules-of-Life audit harness self-test passed.'
