#!/usr/bin/env bash
# install-runner-mac.sh
#
# Instala ffmpeg (si hace falta) y registra esta Mac como GitHub
# Actions self-hosted runner del repo GermanCodigo/graba-live,
# corriendo como servicio en segundo plano (launchd).
#
# Uso:
#   ./install-runner-mac.sh TU_TOKEN_DE_REGISTRO
#
# El token se consigue en:
#   https://github.com/GermanCodigo/graba-live/settings/actions/runners/new
# (vence en ~1 hora, así que corré este script apenas lo copies)

set -euo pipefail

REPO_URL="https://github.com/GermanCodigo/graba-live"
RUNNER_NAME="mac-de-german"
RUNNER_DIR="$HOME/actions-runner-graba-live"

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "Uso: ./install-runner-mac.sh TU_TOKEN_DE_REGISTRO" >&2
  echo "Conseguí el token en: $REPO_URL/settings/actions/runners/new" >&2
  exit 1
fi

echo "== 1/4: Verificando ffmpeg =="
if ! command -v ffmpeg >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "No tenés Homebrew instalado. Instalalo primero desde https://brew.sh y volvé a correr este script." >&2
    exit 1
  fi
  echo "Instalando ffmpeg con Homebrew..."
  brew install ffmpeg
else
  echo "ffmpeg ya está instalado: $(ffmpeg -version | head -1)"
fi

echo "== 2/4: Descargando el runner de GitHub Actions (macOS ARM64) =="
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

LATEST_JSON=$(curl -sS https://api.github.com/repos/actions/runner/releases/latest)
VERSION=$(echo "$LATEST_JSON" | grep -m1 '"tag_name"' | sed -E 's/.*"v([0-9.]+)".*/\1/')
if [ -z "$VERSION" ]; then
  echo "No pude averiguar la última versión del runner. Revisá tu conexión a internet." >&2
  exit 1
fi
echo "Última versión: $VERSION"

ASSET="actions-runner-osx-arm64-${VERSION}.tar.gz"
if [ ! -f "$ASSET" ]; then
  curl -sSL -o "$ASSET" "https://github.com/actions/runner/releases/download/v${VERSION}/${ASSET}"
fi
tar xzf "$ASSET"

echo "== 3/4: Registrando el runner contra $REPO_URL =="
./config.sh --url "$REPO_URL" --token "$TOKEN" --name "$RUNNER_NAME" --labels self-hosted,macOS,ARM64 --unattended --replace

echo "== 4/4: Instalando como servicio (arranca solo, corre en segundo plano) =="
sudo ./svc.sh install
sudo ./svc.sh start

echo ""
echo "Listo. Revisá que aparezca 'Idle' (verde) en:"
echo "  $REPO_URL/settings/actions/runners"
