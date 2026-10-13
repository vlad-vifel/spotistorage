param(
    [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = "Stop"

$Version = "9.0.2"
$Url = "https://github.com/GyanD/codexffmpeg/releases/download/$Version/ffmpeg-$Version-full_build-shared.zip"
$Sha256 = "8d31e162f1616e37aab3fa2db991b97e1b8dbeb1c8465fd81a81be16ff91b328"

if (Test-Path (Join-Path $Destination "ffmpeg.exe")) {
    Write-Host "FFmpeg already present in $Destination"
    exit 0
}

$work = Join-Path ([System.IO.Path]::GetTempPath()) "spotistorage-ffmpeg-$Version"
$zip = Join-Path $work "ffmpeg.zip"
New-Item -ItemType Directory -Force $work | Out-Null

if (-not (Test-Path $zip) -or (Get-FileHash $zip -Algorithm SHA256).Hash -ne $Sha256.ToUpper()) {
    Write-Host "Downloading FFmpeg $Version..."
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri $Url -OutFile $zip
}

$hash = (Get-FileHash $zip -Algorithm SHA256).Hash
if ($hash -ne $Sha256.ToUpper()) {
    throw "FFmpeg checksum mismatch: expected $Sha256, got $hash"
}

$extract = Join-Path $work "extract"
if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
Expand-Archive -Path $zip -DestinationPath $extract

$bin = Get-ChildItem -Path $extract -Directory | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
New-Item -ItemType Directory -Force $Destination | Out-Null
Copy-Item (Join-Path $bin "ffmpeg.exe"), (Join-Path $bin "ffprobe.exe") $Destination
Copy-Item (Join-Path $bin "*.dll") $Destination
Write-Host "FFmpeg $Version copied to $Destination"
