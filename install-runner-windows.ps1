<#
.SYNOPSIS
  Instala ffmpeg (si hace falta) y registra esta PC como GitHub Actions
  self-hosted runner del repo GermanCodigo/graba-live, corriendo como
  Servicio de Windows.

.PARAMETER Token
  Token de registro, sacado de:
  https://github.com/GermanCodigo/graba-live/settings/actions/runners/new
  (vence en ~1 hora)

.EXAMPLE
  .\install-runner-windows.ps1 -Token "AXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/GermanCodigo/graba-live"
$RunnerName = "windows-de-german"
$RunnerDir = Join-Path $env:USERPROFILE "actions-runner-graba-live"

function Test-Admin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Error "Corré esta PowerShell como Administrador (click derecho -> Ejecutar como administrador) y volvé a intentar."
    exit 1
}

Write-Host "== 1/4: Verificando ffmpeg ==" -ForegroundColor Cyan
$ffmpegOk = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegOk) {
    $wingetOk = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetOk) {
        Write-Host "Instalando ffmpeg con winget..."
        winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
        Write-Host "Si el comando 'ffmpeg' todavía no se reconoce después de esto, abrí una PowerShell nueva (para que tome el PATH actualizado) y volvé a correr este script." -ForegroundColor Yellow
    } else {
        Write-Warning "No encontré 'winget'. Instalá ffmpeg a mano: ver la sección 'Si winget no puede instalar ffmpeg' en README-runner-windows.md, y volvé a correr este script."
        exit 1
    }
} else {
    Write-Host "ffmpeg ya está instalado."
}

Write-Host "== 2/4: Descargando el runner de GitHub Actions (Windows x64) ==" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $RunnerDir | Out-Null
Set-Location $RunnerDir

$latest = Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest"
$version = $latest.tag_name.TrimStart("v")
Write-Host "Última versión: $version"

$assetName = "actions-runner-win-x64-$version.zip"
$assetPath = Join-Path $RunnerDir $assetName
if (-not (Test-Path $assetPath)) {
    $downloadUrl = "https://github.com/actions/runner/releases/download/v$version/$assetName"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $assetPath
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (-not (Test-Path (Join-Path $RunnerDir "config.cmd"))) {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($assetPath, $RunnerDir)
}

Write-Host "== 3/4: Registrando el runner contra $RepoUrl ==" -ForegroundColor Cyan
& .\config.cmd --url $RepoUrl --token $Token --name $RunnerName --labels self-hosted,Windows,X64 --unattended --replace --runasservice

Write-Host "== 4/4: Confirmando que el servicio quedó instalado ==" -ForegroundColor Cyan
Get-Service actions.runner.* | Format-Table -AutoSize

Write-Host ""
Write-Host "Listo. Revisá que aparezca 'Idle' (verde) en:" -ForegroundColor Green
Write-Host "  $RepoUrl/settings/actions/runners"
