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
- 🎨 Unified CSS variable system for easy customization
- 📱 Responsive layout (mobile cards for tables)
- ⚡ Compatible with LuCI ucode (OpenWrt 23.x+)
- ⚙️ Built-in theme settings (System → System → Language and Style)

## Theme Settings

The theme includes a built-in settings panel available at **System → System → Language and Style**:

| Setting            | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| **Accent Color**   | Select accent color: Blue, Purple, Green, Orange, Red            |
| **Border Radius**  | Corner style: Sharp, Rounded, Extra Rounded                       |
| **Zoom**           | Interface scale (75% - 150%), similar to Ctrl+/- in a browser     |
| **Animations**     | Enable/disable animations and transitions                         |
| **Transparency**   | Blur and transparency effect for the menu panel                  |

All settings are stored in the browser (localStorage) and applied automatically on page load.

## Installation

### 🚀 Quick Install (For Testing)

Connect to your router via SSH and run:

```bash
wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

Or using curl:

```bash
curl -fsSL https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

### Building the .ipk (OpenWrt Buildroot)

```bash
cp -r luci-theme-proton2025 ~/openwrt/feeds/luci/themes/
cd ~/openwrt
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig  # LuCI -> Themes -> luci-theme-proton2025
make package/luci-theme-proton2025/compile V=s
```

## Removal

### Quick Removal

```bash
# 1. Download the script
wget -O uninstall.sh https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/uninstall.sh

# 2. Make it executable (just in case)
chmod +x uninstall.sh

# 3. Run it directly — it is now interactive
./uninstall.sh
```

### Revert to the Default Theme (without uninstalling)

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
│   │   ├── logo.svg
│   │   └── spinner.svg
│   └── resources/menu-proton2025.js
├── root/etc/uci-defaults/30_luci-theme-proton2025
└── ucode/template/themes/proton2025/
    ├── header.ut
    ├── footer.ut
    └── sysauth.ut
```

## License

Apache-2.0
