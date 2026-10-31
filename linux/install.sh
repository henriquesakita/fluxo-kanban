#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Fluxo"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/fluxo"
BIN_DIR="$HOME/.local/bin"
APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

echo "Instalando $APP_NAME em $DEST"

mkdir -p "$DEST" "$BIN_DIR" "$APPS_DIR"
cp -a "$HERE/." "$DEST/"

chmod +x "$DEST/fluxo" "$DEST/chrome_crashpad_handler" "$DEST/chrome-sandbox"
chmod 4755 "$DEST/chrome-sandbox" 2>/dev/null || true

ln -sf "$DEST/fluxo" "$BIN_DIR/fluxo"

cat > "$APPS_DIR/fluxo.desktop" <<EOF
[Desktop Entry]
Name=Fluxo
Comment=Quadro Kanban em tema escuro
Exec="$DEST/fluxo" %U
Icon="$DEST/fluxo.png"
Terminal=false
Type=Application
Categories=Office;ProjectManagement;
StartupWMClass=Fluxo
EOF

chmod +x "$APPS_DIR/fluxo.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
fi

echo "Pronto!"
echo "Abra pelo menu de aplicativos ou execute: fluxo"
echo "Se o comando nao for encontrado, adicione $BIN_DIR ao PATH."
