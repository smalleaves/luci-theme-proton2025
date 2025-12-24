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
detect_luci_themes_dir() {
    for p in \
        "/usr/share/ucode/luci/template/themes" \
        "/usr/lib/ucode/luci/template/themes"; do
        if [ -d "$p" ]; then
            LUCI_THEMES="$p"
            return 0
        fi
    done
    LUCI_THEMES="/usr/share/ucode/luci/template/themes"
    return 0
}

info() { printf "[*] %s\n" "$1"; }
ok() { printf "[+] %s\n" "$1"; }
warn() { printf "[!] %s\n" "$1"; }
err() { printf "[-] %s\n" "$1"; }

printf "\n"
printf "================================================\n"
printf "    Proton2025 Theme Installer\n"
printf "    Modern Dark Theme for LuCI\n"
printf "================================================\n"
printf "\n"

# Check if running on OpenWrt
check_openwrt() {
    if [ ! -f /etc/openwrt_release ]; then
        warn "This doesn't appear to be an OpenWrt system."
        warn "Continuing anyway..."
    else
        . /etc/openwrt_release
        ok "Detected: ${DISTRIB_DESCRIPTION}"
    fi
}

# Check for required tools
check_dependencies() {
    info "Checking dependencies..."
    
    if command -v wget >/dev/null 2>&1; then
        DOWNLOADER="wget"
        ok "wget found"
    elif command -v curl >/dev/null 2>&1; then
        DOWNLOADER="curl"
        ok "curl found"
    else
        err "Neither wget nor curl found. Please install one:"
        printf "  opkg update && opkg install wget\n"
        exit 1
    fi
    
    if ! command -v tar >/dev/null 2>&1; then
        err "tar not found. Please install:"
        printf "  opkg update && opkg install tar\n"
        exit 1
    fi
    ok "tar found"
}

# Download theme
download_theme() {
    info "Downloading theme..."
    
    rm -rf "$TMP_DIR"
    mkdir -p "$TMP_DIR"
    
    cd "$TMP_DIR" || exit 1
    
    if [ "$DOWNLOADER" = "wget" ]; then
        wget -q --no-check-certificate -O theme.tar.gz "$ARCHIVE_URL"
    else
        curl -fsSL -o theme.tar.gz "$ARCHIVE_URL"
    fi
    
    if [ ! -f theme.tar.gz ]; then
        err "Failed to download theme"
        exit 1
    fi
    
    ok "Downloaded successfully"
}

# Extract and install
install_theme() {
    info "Installing theme..."
    
    cd "$TMP_DIR" || exit 1
    
    tar -xzf theme.tar.gz
    
    EXTRACT_DIR=$(find . -maxdepth 1 -type d -name "luci-theme-proton2025*" | head -1)
    
    if [ -z "$EXTRACT_DIR" ]; then
        err "Failed to extract theme"
        exit 1
    fi
    
    mkdir -p "$LUCI_STATIC/$THEME_NAME"
    mkdir -p "$LUCI_RESOURCES"
    mkdir -p "$LUCI_THEMES/$THEME_NAME"
    mkdir -p "$UCI_DEFAULTS"
    
    if [ -d "$EXTRACT_DIR/htdocs/luci-static/$THEME_NAME" ]; then
        cp -rf "$EXTRACT_DIR/htdocs/luci-static/$THEME_NAME/"* "$LUCI_STATIC/$THEME_NAME/"
        ok "Installed static files"
    fi
    
    if [ -d "$EXTRACT_DIR/htdocs/luci-static/resources" ]; then
        cp -rf "$EXTRACT_DIR/htdocs/luci-static/resources/"* "$LUCI_RESOURCES/"
        ok "Installed JavaScript resources"
    fi
    
    if [ -d "$EXTRACT_DIR/ucode/template/themes/$THEME_NAME" ]; then
        cp -rf "$EXTRACT_DIR/ucode/template/themes/$THEME_NAME/"* "$LUCI_THEMES/$THEME_NAME/"
        ok "Installed template files"
    fi
    
    if [ -d "$EXTRACT_DIR/root/etc/uci-defaults" ]; then
        cp -rf "$EXTRACT_DIR/root/etc/uci-defaults/"* "$UCI_DEFAULTS/"
        ok "Installed uci-defaults"
    fi
    
    install_translations "$EXTRACT_DIR"
}

# Install translations
install_translations() {
    EXTRACT_DIR="$1"
    PO_DIR="$EXTRACT_DIR/po"
    
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
    
    # Download precompiled translations from latest release
    info "Downloading precompiled translations..."
    RELEASE_URL="https://github.com/ChesterGoodiny/luci-theme-proton2025/releases/latest/download"
    TRANSLATIONS_INSTALLED=0
    
    if [ -d "$PO_DIR" ]; then
        for lang_dir in "$PO_DIR"/*/; do
            if [ -d "$lang_dir" ]; then
                lang=$(basename "$lang_dir")
                if [ "$lang" != "templates" ]; then
                    lmo_file="$I18N_DIR/theme-proton2025.$lang.lmo"
                    lmo_url="$RELEASE_URL/theme-proton2025.$lang.lmo"
                    
                    # Try downloading
                    DOWNLOAD_SUCCESS=0
                    if [ "$DOWNLOADER" = "wget" ]; then
                        if wget -q --no-check-certificate -O "$lmo_file" "$lmo_url" 2>/dev/null; then
                            DOWNLOAD_SUCCESS=1
                        fi
                    else
                        if curl -fsSL -o "$lmo_file" "$lmo_url" 2>/dev/null; then
                            DOWNLOAD_SUCCESS=1
                        fi
                    fi
                    
                    # Verify file size (valid .lmo should be > 100 bytes)
                    if [ "$DOWNLOAD_SUCCESS" -eq 1 ] && [ -f "$lmo_file" ]; then
                        FILE_SIZE=$(stat -f%z "$lmo_file" 2>/dev/null || stat -c%s "$lmo_file" 2>/dev/null || echo 0)
                        if [ "$FILE_SIZE" -gt 100 ]; then
                            ok "Installed $lang translation"
                            TRANSLATIONS_INSTALLED=$((TRANSLATIONS_INSTALLED + 1))
                        else
                            rm -f "$lmo_file"
                        fi
                    fi
                fi
            fi
        done
    fi
    
    if [ "$TRANSLATIONS_INSTALLED" -eq 0 ]; then
        warn "Failed to download translations from GitHub Releases"
        warn "Theme will work, but only in English"
        warn "To get translations: install IPK package instead"
        warn "  https://github.com/ChesterGoodiny/luci-theme-proton2025/releases/latest"
    fi
}

# Register theme
register_theme() {
    info "Registering theme..."
    
    if [ -f "$UCI_DEFAULTS/30_luci-theme-proton2025" ]; then
        sh "$UCI_DEFAULTS/30_luci-theme-proton2025"
        ok "Theme registered"
    fi
    
    if command -v uci >/dev/null 2>&1; then
        uci set luci.main.mediaurlbase="/luci-static/$THEME_NAME"
        uci commit luci
        ok "Set as default theme"
    fi
}

# Cleanup
cleanup() {
    info "Cleaning up..."
    rm -rf "$TMP_DIR"
    rm -rf /tmp/luci-modulecache 2>/dev/null || true
    rm -rf /tmp/luci-indexcache* 2>/dev/null || true
    ok "Cleanup complete"
}

# Main
main() {
    check_openwrt
    check_dependencies
    detect_luci_themes_dir
    download_theme
    install_theme
    register_theme
    cleanup
    
    printf "\n"
    printf "================================================\n"
    printf "    Installation Complete!\n"
    printf "================================================\n"
    printf "\n"
    printf "  [*] Refresh your browser (Ctrl+F5)\n"
    printf "  [*] Theme: System -> System -> Language and Style\n"
    printf "\n"
}

main
