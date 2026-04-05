param(
    [string]$ProjectRoot = ""
)

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$wailsJsonPath = Join-Path $ProjectRoot "wails.json"
$outputPath = Join-Path $ProjectRoot "build\windows\installer\version.nsh"

$outputDir = Split-Path -Parent $outputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$wailsContent = Get-Content $wailsJsonPath -Raw | ConvertFrom-Json
$version = $wailsContent.info.productVersion

if ($version -match '\+rc') {
    $finalVersion = $version.Replace('+rc', '').Replace('v', '')
}
else {
    $finalVersion = "$version.0".Replace('v', '')
}

$versionContent = "!define FINAL_VERSION `"$finalVersion`""
Set-Content -Path $outputPath -Value $versionContent -Encoding ASCII -Force

Write-Host "Generated $outputPath with FINAL_VERSION=$finalVersion"
