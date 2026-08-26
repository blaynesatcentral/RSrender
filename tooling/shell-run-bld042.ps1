$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$temporaryRoot = Join-Path $root ".tmp"
$label = "bld-f-$PID"
$profile = Join-Path $temporaryRoot "f-$PID-p"
$stdoutPath = Join-Path $temporaryRoot "f-$PID.stdout.log"
$stderrPath = Join-Path $temporaryRoot "f-$PID.stderr.log"
$evidencePath = Join-Path $root "artifacts\bld-042-font-palette-evidence.json"
$env:RSRENDER_BORING_LOG_PACKAGE_LABEL = $label

Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

try {
  $packageText = (& node (Join-Path $root "tooling\shell-package-bld026.mjs") | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "BLD042_PACKAGE_FAILED:$LASTEXITCODE" }
  $package = $packageText | ConvertFrom-Json
  if ($package.result -ne "PASS") { throw "BLD042_PACKAGE_RESULT_INVALID" }
  $proofDirectory = Join-Path $package.paths.temporaryRoot "proof"
  $projectPath = Join-Path $proofDirectory "font-proof.rsrender"
  $pdfPath = Join-Path $proofDirectory "font-proof.pdf"
  New-Item -ItemType Directory -Path $proofDirectory -Force | Out-Null
  Remove-Item -LiteralPath $projectPath, $pdfPath -Force -ErrorAction SilentlyContinue

  # Windows may still be scanning freshly written Electron runtime DLLs after packaging returns.
  Start-Sleep -Seconds 10
  $started = Get-Date
  $probeArguments = @(
    "--rsrender-bld042-font-probe",
    "--rsrender-bld027-profile=$profile",
    "--rsrender-bld027-output=$pdfPath",
    "--rsrender-bld035-output=$projectPath"
  )
  $process = Start-Process `
    -FilePath $package.paths.packagedExecutable `
    -ArgumentList $probeArguments `
    -Wait `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath
  $durationMilliseconds = [Math]::Round(((Get-Date) - $started).TotalMilliseconds)
  $stdout = [IO.File]::ReadAllText($stdoutPath)
  $stderr = [IO.File]::ReadAllText($stderrPath)
  $marker = "RSRENDER_BLD025_RESULT="
  $resultLines = @($stdout -split '\r?\n' | Where-Object { $_.StartsWith($marker) })
  if ($resultLines.Count -ne 1) { throw "BLD042_RESULT_MARKER_INVALID:$stdout" }
  $encodedResult = $resultLines[0].Substring($marker.Length)
  $resultText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedResult))
  $result = $resultText | ConvertFrom-Json

  if (
    $process.ExitCode -ne 0 -or
    $stderr.Length -ne 0 -or
    $result.schema -ne "rsrender.bld042.font-palette-probe.v1" -or
    $result.result -ne "PASS" -or
    $result.palette.Count -ne 4 -or
    $result.applied.faceId -ne "font.face.source-serif-4.bold-italic" -or
    $result.applied.fontFaceDigest -ne "sha256:7b215b37f8873f5579f3f8d2ded3ca7c588e2f435cd996605ebfc5befe2cd5eb" -or
    $result.applied.fontMetricsDigest -ne "sha256:f057826173c7df47881637f459ea87cbb8af6836053dff0dc83921ad50772890" -or
    $result.undone.family -ne "font.logical.rsrender-sans" -or
    $result.redone.faceId -ne "font.face.source-serif-4.bold-italic" -or
    $result.persistence.bodyBound -ne "true" -or
    -not $result.persistence.saveStatus.StartsWith("Project saved and reopened successfully:") -or
    $result.persistence.persistedStyle.fontFamilyId -ne "font.logical.source-serif-4" -or
    $result.persistence.persistedStyle.fontStyle -ne "italic" -or
    $result.persistence.persistedStyle.fontWeight -ne 700 -or
    $result.publication.result -ne "EXPORT_VERIFIED_SUCCESS" -or
    $result.publication.destinationPath -ne $pdfPath -or
    -not (Test-Path -LiteralPath $projectPath) -or
    -not (Test-Path -LiteralPath $pdfPath)
  ) {
    throw "BLD042_PACKAGED_FONT_PALETTE_INVALID:$resultText"
  }

  $run = [ordered]@{
    index = 1
    durationMs = $durationMilliseconds
    result = $result
    process = [ordered]@{
      exitCode = $process.ExitCode
      signal = $null
      timedOut = $false
      stdoutBytes = [Text.Encoding]::UTF8.GetByteCount($stdout)
      stderrBytes = [Text.Encoding]::UTF8.GetByteCount($stderr)
      after = 0
      profileRemoved = $true
      launchHost = "powershell-direct"
    }
  }
  $evidence = [ordered]@{
    schema = "rsrender.bld042.font-palette-evidence.v1"
    result = "PASS"
    package = $package
    attempts = @($run)
    run = $run
  }
  $evidenceJson = $evidence | ConvertTo-Json -Depth 100 -Compress
  [IO.File]::WriteAllText($evidencePath, $evidenceJson, [Text.UTF8Encoding]::new($false))
  Write-Output $evidenceJson
}
finally {
  Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
}
