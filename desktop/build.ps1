param(
    [string]$Version,
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$Desktop = $PSScriptRoot
$Root = Split-Path $Desktop -Parent
$Build = Join-Path $Desktop "build"
$Dist = Join-Path $Desktop "dist"

function Invoke-Step([string]$Name, [scriptblock]$Command) {
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}

if (-not $Version) {
    $Version = (Select-String -Path (Join-Path $Root "backend\pyproject.toml") -Pattern '^version = "(.+)"').Matches[0].Groups[1].Value
}
$Version = $Version.TrimStart("v")
Write-Host "Building SpotiStorage $Version"

New-Item -ItemType Directory -Force $Build | Out-Null

Invoke-Step "Install frontend dependencies" { npm ci --prefix (Join-Path $Root "frontend") }
Invoke-Step "Build frontend" { npm run build --prefix (Join-Path $Root "frontend") }
Invoke-Step "Sync backend + desktop dependencies" { uv sync --directory (Join-Path $Root "backend") --group desktop --locked }
Invoke-Step "Fetch FFmpeg" { & (Join-Path $Desktop "fetch-ffmpeg.ps1") -Destination (Join-Path $Build "ffmpeg") }

$parts = ($Version.Split(".") + @("0", "0", "0", "0"))[0..3] | ForEach-Object { [int]($_ -replace "\D.*$", "") }
$fileVersion = $parts -join ", "
@"
VSVersionInfo(
  ffi=FixedFileInfo(filevers=($fileVersion), prodvers=($fileVersion)),
  kids=[
    StringFileInfo([StringTable('040904B0', [
      StringStruct('CompanyName', 'SpotiStorage'),
      StringStruct('FileDescription', 'SpotiStorage'),
      StringStruct('FileVersion', '$Version'),
      StringStruct('ProductName', 'SpotiStorage'),
      StringStruct('ProductVersion', '$Version')])]),
    VarFileInfo([VarStruct('Translation', [1033, 1200])])
  ]
)
"@ | Set-Content -Encoding utf8 (Join-Path $Build "version_info.txt")

Invoke-Step "PyInstaller" {
    uv run --directory (Join-Path $Root "backend") --group desktop pyinstaller --noconfirm --clean `
        --distpath $Dist --workpath (Join-Path $Build "pyinstaller") (Join-Path $Desktop "spotistorage.spec")
}

Write-Host "==> Copy FFmpeg next to the executable"
Copy-Item -Recurse -Force (Join-Path $Build "ffmpeg") (Join-Path $Dist "SpotiStorage\ffmpeg")

$exe = Join-Path $Dist "SpotiStorage\SpotiStorage.exe"
$selfTestDir = Join-Path $Build "self-test"
if (Test-Path $selfTestDir) { Remove-Item -Recurse -Force $selfTestDir }
Write-Host "==> Self-test"
$env:SPOTISTORAGE_CONFIG_DIR = $selfTestDir
$process = Start-Process -FilePath $exe -ArgumentList "--self-test" -Wait -PassThru
Remove-Item Env:SPOTISTORAGE_CONFIG_DIR
if ($process.ExitCode -ne 0) {
    Get-Content (Join-Path $selfTestDir "logs\app.log") -ErrorAction SilentlyContinue
    throw "Self-test failed with exit code $($process.ExitCode)"
}
Write-Host "Self-test passed"

if ($SkipInstaller) { return }

$iscc = Get-Command iscc -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $iscc) {
    $iscc = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $iscc) { throw "Inno Setup 6 (ISCC.exe) not found, install it from https://jrsoftware.org/isinfo.php" }

Invoke-Step "Inno Setup" {
    & $iscc "/DAppVersion=$Version" "/DSourceDir=$(Join-Path $Dist 'SpotiStorage')" "/DOutputDir=$Dist" (Join-Path $Desktop "installer.iss")
}
Write-Host "Installer: $(Join-Path $Dist "SpotiStorage-Setup-v$Version.exe")"
