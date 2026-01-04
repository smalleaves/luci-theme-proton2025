# luci-theme-proton2025

An elegant dark theme for LuCI (OpenWrt 23.x+).

![OpenWrt](https://img.shields.io/badge/OpenWrt-23.x%2B-blue)
![LuCI](https://img.shields.io/badge/LuCI-ucode-green)
![License](https://img.shields.io/badge/License-Apache%202.0-orange)

## Screenshots

### LuCI Status

<div align="center">
  <img src="docs/status.png" alt="LuCI Status" />
</div>

### Theme Settings

<div align="center">
  <img src="docs/settings.png" alt="Theme Settings" />
</div>

## Features

- 🌙 Dark glass/blur design
- 🎨 Customizable accent color, border radius, zoom
- 📱 Responsive layout for mobile devices
- ⚡ Compatible with LuCI ucode (OpenWrt 23.x+)
- 📊 Services monitoring widget on Status → Overview page
- 🌡️ Temperature monitoring widget with thermal sensors
- 📈 Elegant Load Average visualization with color-coded progress bars
- 🌐 Localization support (i18n)

## Widgets

### Services Widget

The main page (Status → Overview) displays a widget showing system service statuses:

- Status visualization (Running/Stopped)
- Add services via modal or custom input
- Settings saved in browser

### Temperature Widget

Real-time temperature monitoring on Status → Overview:

- Reads data from `/sys/class/thermal/` and `/sys/class/hwmon/`
- Color-coded levels (Normal, Warm, Hot, Critical)
- Peak temperature tracking
- Auto-refresh every 5 seconds
- Built-in ucode RPC module (no external dependencies)

## Theme Settings

Available at **System → System → Language and Style**:

- Accent color (Blue, Purple, Green, Orange, Red)
- Border radius
- Interface zoom
- Animations and transparency
- Services widget (enable/disable, grouping, log)

## Installation

### Recommended: Install from IPK Package

Download the latest release for your architecture:

```bash
# For MediaTek Filogic (aarch64_cortex-a53)
wget https://github.com/ChesterGoodiny/luci-theme-proton2025/releases/latest/download/luci-theme-proton2025_*_all.ipk
opkg install luci-theme-proton2025_*_all.ipk
```

Or download from [GitHub Releases](https://github.com/ChesterGoodiny/luci-theme-proton2025/releases) manually.

**Benefits:**

- ✅ Includes compiled translations
- ✅ Proper package management (easy updates/removal)
- ✅ Dependency tracking

### Quick Install (Testing Only)

> ⚠️ **Note:** This method is intended for testing purposes. Translations may not work if the release has not yet been created on GitHub.

```bash
wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

Or:

```bash
curl -fsSL https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

### Building .ipk from Source

```bash
cp -r luci-theme-proton2025 ~/openwrt/feeds/luci/themes/
cd ~/openwrt
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig  # LuCI -> Themes -> luci-theme-proton2025
make package/luci-theme-proton2025/compile V=s
```

## Removal

```bash
wget -O uninstall.sh https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/uninstall.sh
chmod +x uninstall.sh
./uninstall.sh
```

### Revert to Default Theme

```sh
uci set luci.main.mediaurlbase=/luci-static/bootstrap
uci commit luci
/etc/init.d/uhttpd restart
```

## Structure

```
luci-theme-proton2025/
├── Makefile
├── htdocs/luci-static/
│   ├── proton2025/
│   │   ├── cascade.css
│   │   ├── services-widget.js
│   │   ├── translations.js
│   │   ├── icons/
│   │   └── logo.svg
│   └── resources/menu-proton2025.js
├── root/
│   ├── etc/uci-defaults/
│   │   └── 30_luci-theme-proton2025
│   └── usr/share/rpcd/
│       ├── acl.d/luci-theme-proton2025.json
│       └── ucode/luci.proton-temp
└── ucode/template/themes/proton2025/
    ├── header.ut
    ├── footer.ut
    └── sysauth.ut
```

## License

Apache-2.0
