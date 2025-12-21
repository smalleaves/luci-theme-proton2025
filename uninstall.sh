#!/bin/sh
# ============================================================
# Proton2025 Theme Uninstaller for OpenWrt/LuCI
# ============================================================
# Run: wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/uninstall.sh | sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

THEME_NAME="proton2025"

echo ""
echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║${NC}     ${YELLOW}Proton2025 Theme Uninstaller${NC}                           ${BLUE}║${NC}"
echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "${YELLOW}Warning: This will remove Proton2025 theme.${NC}"
echo "Continue? (y/n)"
read -r answer
if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "${RED}Uninstallation cancelled.${NC}"
    exit 0
fi

echo "${BLUE}→${NC} Switching to default theme..."
if command -v uci >/dev/null 2>&1; then
    # Try to set bootstrap as default, fallback to openwrt
    if [ -d "/www/luci-static/bootstrap" ]; then
        uci set luci.main.mediaurlbase="/luci-static/bootstrap"
    else
        uci set luci.main.mediaurlbase="/luci-static/openwrt"
    fi
    uci commit luci
    echo "${GREEN}✓${NC} Switched to default theme"
fi

echo "${BLUE}→${NC} Removing theme files..."

# Remove static files
rm -rf "/www/luci-static/$THEME_NAME"
echo "${GREEN}✓${NC} Removed static files"

# Remove JS
rm -f "/www/luci-static/resources/menu-proton2025.js"
echo "${GREEN}✓${NC} Removed JavaScript"

# Remove templates
rm -rf "/usr/lib/ucode/luci/template/themes/$THEME_NAME"
echo "${GREEN}✓${NC} Removed templates"

# Remove uci-defaults
rm -f "/etc/uci-defaults/30_luci-theme-proton2025"
echo "${GREEN}✓${NC} Removed uci-defaults"

# Clear cache
echo "${BLUE}→${NC} Clearing cache..."
rm -rf /tmp/luci-modulecache 2>/dev/null || true
rm -rf /tmp/luci-indexcache* 2>/dev/null || true
echo "${GREEN}✓${NC} Cache cleared"

echo ""
echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║${NC}     ${GREEN}Uninstallation Complete!${NC}                                ${GREEN}║${NC}"
echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  ${BLUE}→${NC} Refresh your browser (Ctrl+F5)"
echo ""
