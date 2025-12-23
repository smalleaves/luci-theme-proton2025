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

echo "${YELLOW}Removing Proton2025 theme...${NC}"
echo ""

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

echo "${BLUE}→${NC} Removing theme from LuCI registry..."
if command -v uci >/dev/null 2>&1; then
    uci delete luci.themes.Proton2025 2>/dev/null || true
    uci commit luci
    echo "${GREEN}✓${NC} Theme removed from registry"
fi

echo "${BLUE}→${NC} Removing theme files..."

# Remove static files
rm -rf "/www/luci-static/$THEME_NAME"
echo "${GREEN}✓${NC} Removed static files"

# Remove JS
rm -f "/www/luci-static/resources/menu-proton2025.js"
echo "${GREEN}✓${NC} Removed JavaScript"

# Remove templates
for p in \
    "/usr/share/ucode/luci/template/themes" \
    "/usr/lib/ucode/luci/template/themes"; do
    if [ -d "$p" ]; then
        rm -rf "$p/$THEME_NAME" 2>/dev/null || true
    fi
done
echo "${GREEN}✓${NC} Removed templates"

# Remove uci-defaults
rm -f "/etc/uci-defaults/30_luci-theme-proton2025"
echo "${GREEN}✓${NC} Removed uci-defaults"

# Remove translations
for p in "/usr/share/luci/i18n" "/usr/lib/lua/luci/i18n"; do
    if [ -d "$p" ]; then
        rm -f "$p/theme-proton2025".*.lmo 2>/dev/null || true
    fi
done
echo "${GREEN}✓${NC} Removed translations"

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
