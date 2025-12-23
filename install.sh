#!/bin/sh
# ============================================================
# Proton2025 Theme Installer for OpenWrt/LuCI
# ============================================================
# One-line install:
# wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
# or with curl:
# curl -fsSL https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Theme info
THEME_NAME="proton2025"
REPO_URL="https://github.com/ChesterGoodiny/luci-theme-proton2025"
BRANCH="main"
ARCHIVE_URL="${REPO_URL}/archive/refs/heads/${BRANCH}.tar.gz"

# Paths
TMP_DIR="/tmp/proton2025-install"
LUCI_STATIC="/www/luci-static"
LUCI_RESOURCES="/www/luci-static/resources"
LUCI_THEMES=""
UCI_DEFAULTS="/etc/uci-defaults"

# Detect LuCI ucode template themes directory.
# Different OpenWrt/LuCI builds may use either /usr/share/... or /usr/lib/...
detect_luci_themes_dir() {
    for p in \
        "/usr/share/ucode/luci/template/themes" \
        "/usr/lib/ucode/luci/template/themes"; do
        if [ -d "$p" ]; then
            LUCI_THEMES="$p"
            return 0
        fi
    done

    # Fallback: prefer /usr/share for arch-independent data
    LUCI_THEMES="/usr/share/ucode/luci/template/themes"
    return 0
}

echo ""
echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║${NC}     ${GREEN}Proton2025 Theme Installer${NC}                             ${BLUE}║${NC}"
echo "${BLUE}║${NC}     Modern Dark Theme for LuCI                             ${BLUE}║${NC}"
echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running on OpenWrt
check_openwrt() {
    if [ ! -f /etc/openwrt_release ]; then
        echo "${YELLOW}Warning: This doesn't appear to be an OpenWrt system.${NC}"
        echo "${YELLOW}Continuing anyway...${NC}"
    else
        . /etc/openwrt_release
        echo "${GREEN}✓${NC} Detected: ${DISTRIB_DESCRIPTION}"
    fi
}

# Check for required tools
check_dependencies() {
    echo "${BLUE}→${NC} Checking dependencies..."
    
    # Check for wget or curl
    if command -v wget >/dev/null 2>&1; then
        DOWNLOADER="wget"
        echo "${GREEN}✓${NC} wget found"
    elif command -v curl >/dev/null 2>&1; then
        DOWNLOADER="curl"
        echo "${GREEN}✓${NC} curl found"
    else
        echo "${RED}✗${NC} Neither wget nor curl found. Please install one:"
        echo "  opkg update && opkg install wget"
        exit 1
    fi
    
    # Check for tar
    if ! command -v tar >/dev/null 2>&1; then
        echo "${RED}✗${NC} tar not found. Please install:"
        echo "  opkg update && opkg install tar"
        exit 1
    fi
    echo "${GREEN}✓${NC} tar found"
}

# Download theme
download_theme() {
    echo "${BLUE}→${NC} Downloading theme..."
    
    # Clean up old temp directory
    rm -rf "$TMP_DIR"
    mkdir -p "$TMP_DIR"
    
    cd "$TMP_DIR" || exit 1
    
    if [ "$DOWNLOADER" = "wget" ]; then
        wget -q --no-check-certificate -O theme.tar.gz "$ARCHIVE_URL"
    else
        curl -fsSL -o theme.tar.gz "$ARCHIVE_URL"
    fi
    
    if [ ! -f theme.tar.gz ]; then
        echo "${RED}✗${NC} Failed to download theme"
        exit 1
    fi
    
    echo "${GREEN}✓${NC} Downloaded successfully"
}

# Extract and install
install_theme() {
    echo "${BLUE}→${NC} Installing theme..."
    
    cd "$TMP_DIR" || exit 1
    
    # Extract archive
    tar -xzf theme.tar.gz
    
    # Find extracted directory
    EXTRACT_DIR=$(find . -maxdepth 1 -type d -name "luci-theme-proton2025*" | head -1)
    
    if [ -z "$EXTRACT_DIR" ]; then
        echo "${RED}✗${NC} Failed to extract theme"
        exit 1
    fi
    
    # Create directories if they don't exist
    mkdir -p "$LUCI_STATIC/$THEME_NAME"
    mkdir -p "$LUCI_RESOURCES"
    mkdir -p "$LUCI_THEMES/$THEME_NAME"
    mkdir -p "$UCI_DEFAULTS"
    
    # Copy static files (CSS, images)
    if [ -d "$EXTRACT_DIR/htdocs/luci-static/$THEME_NAME" ]; then
        cp -rf "$EXTRACT_DIR/htdocs/luci-static/$THEME_NAME/"* "$LUCI_STATIC/$THEME_NAME/"
        echo "${GREEN}✓${NC} Installed static files"
    fi
    
    # Copy JS resources
    if [ -d "$EXTRACT_DIR/htdocs/luci-static/resources" ]; then
        cp -rf "$EXTRACT_DIR/htdocs/luci-static/resources/"* "$LUCI_RESOURCES/"
        echo "${GREEN}✓${NC} Installed JavaScript resources"
    fi
    
    # Copy template files
    if [ -d "$EXTRACT_DIR/ucode/template/themes/$THEME_NAME" ]; then
        cp -rf "$EXTRACT_DIR/ucode/template/themes/$THEME_NAME/"* "$LUCI_THEMES/$THEME_NAME/"
        echo "${GREEN}✓${NC} Installed template files"
    fi
    
    # Copy uci-defaults
    if [ -d "$EXTRACT_DIR/root/etc/uci-defaults" ]; then
        cp -rf "$EXTRACT_DIR/root/etc/uci-defaults/"* "$UCI_DEFAULTS/"
        echo "${GREEN}✓${NC} Installed uci-defaults"
    fi
    
    # Install translations if po2lmo is available
    install_translations "$EXTRACT_DIR"
}

# Install translations
install_translations() {
    EXTRACT_DIR="$1"
    PO_DIR="$EXTRACT_DIR/po"
    
    # Check if po directory exists
    if [ ! -d "$PO_DIR" ]; then
        echo "${YELLOW}!${NC} No translations found"
        return 0
    fi
    
    # Find i18n directory
    I18N_DIR=""
    for p in "/usr/share/luci/i18n" "/usr/lib/lua/luci/i18n"; do
        if [ -d "$p" ]; then
            I18N_DIR="$p"
            break
        fi
    done
    
    if [ -z "$I18N_DIR" ]; then
        I18N_DIR="/usr/share/luci/i18n"
        mkdir -p "$I18N_DIR"
    fi
    
    # Check if po2lmo is available
    if command -v po2lmo >/dev/null 2>&1; then
        echo "${BLUE}→${NC} Compiling translations..."
        for lang_dir in "$PO_DIR"/*/; do
            if [ -d "$lang_dir" ]; then
                lang=$(basename "$lang_dir")
                if [ "$lang" != "templates" ]; then
                    for po_file in "$lang_dir"*.po; do
                        if [ -f "$po_file" ]; then
                            lmo_name="theme-proton2025.${lang}.lmo"
                            po2lmo "$po_file" "$I18N_DIR/$lmo_name"
                            echo "${GREEN}✓${NC} Installed translation: $lang"
                        fi
                    done
                fi
            fi
        done
    else
        echo "${YELLOW}!${NC} po2lmo not found, skipping translation compilation"
        echo "   Install with: opkg install luci-base"
    fi
}

# Set theme as active
activate_theme() {
    echo "${BLUE}→${NC} Activating theme..."
    
    # Run uci-defaults if exists
    if [ -f "$UCI_DEFAULTS/30_luci-theme-proton2025" ]; then
        sh "$UCI_DEFAULTS/30_luci-theme-proton2025"
    fi
    
    # Set theme via uci
    if command -v uci >/dev/null 2>&1; then
        uci set luci.main.mediaurlbase="/luci-static/$THEME_NAME"
        uci commit luci
        echo "${GREEN}✓${NC} Theme activated"
    else
        echo "${YELLOW}!${NC} Could not set theme automatically. Set it manually in LuCI."
    fi
}

# Cleanup
cleanup() {
    echo "${BLUE}→${NC} Cleaning up..."
    rm -rf "$TMP_DIR"
    echo "${GREEN}✓${NC} Cleanup complete"
}

# Clear LuCI cache
clear_cache() {
    echo "${BLUE}→${NC} Clearing LuCI cache..."
    rm -rf /tmp/luci-modulecache 2>/dev/null || true
    rm -rf /tmp/luci-indexcache* 2>/dev/null || true
    echo "${GREEN}✓${NC} Cache cleared"
}

# Main installation
main() {
    check_openwrt
    check_dependencies
    detect_luci_themes_dir
    download_theme
    install_theme
    activate_theme
    clear_cache
    cleanup
    
    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║${NC}     ${GREEN}Installation Complete!${NC}                                  ${GREEN}║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  ${BLUE}→${NC} Open LuCI in your browser"
    echo "  ${BLUE}→${NC} Press Ctrl+F5 to refresh cache"
    echo "  ${BLUE}→${NC} Enjoy your new theme!"
    echo ""
    echo "  ${YELLOW}GitHub:${NC} $REPO_URL"
    echo ""
}

# Run
main
