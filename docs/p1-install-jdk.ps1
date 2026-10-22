$ErrorActionPreference = 'Stop'
$workspace = Split-Path $PSScriptRoot -Parent
$toolDir = Join-Path $workspace '.p1-local/tools'
New-Item -ItemType Directory -Force -Path $toolDir | Out-Null
$asset = (Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/11/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse' -TimeoutSec 30)[0]
$archive = Join-Path $toolDir $asset.binary.package.name
if (!(Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -UseBasicParsing -Uri $asset.binary.package.link -OutFile $archive -TimeoutSec 300
}
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $asset.binary.package.checksum) { throw 'JDK archive checksum mismatch' }
$jdkDir = Join-Path $toolDir 'jdk11'
if (!(Test-Path -LiteralPath $jdkDir)) {
    New-Item -ItemType Directory -Path $jdkDir | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $jdkDir
}
$jdkHome = (Get-ChildItem -LiteralPath $jdkDir -Directory | Select-Object -First 1).FullName
@{ javaHome=$jdkHome; source=$asset.binary.package.link; sha256=$actual; apiVersion=$asset.version.semver } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $workspace '.p1-local/jdk.json')
& (Join-Path $jdkHome 'bin/java.exe') -version
