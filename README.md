# luci-theme-proton2025

Элегантная тёмная тема для LuCI (OpenWrt 23.x+).

![OpenWrt](https://img.shields.io/badge/OpenWrt-23.x%2B-blue)
![LuCI](https://img.shields.io/badge/LuCI-ucode-green)
![License](https://img.shields.io/badge/License-Apache%202.0-orange)

## Скриншоты

### Статус LuCI

<div align="center">
  <img src="docs/status.png" alt="LuCI Status" />
</div>

### Настройки темы

<div align="center">
  <img src="docs/settings.png" alt="Theme Settings" />
</div>

## Особенности

- 🌙 Тёмный glass/blur дизайн
- 🎨 Настраиваемый акцентный цвет, скругление, масштаб
- 📱 Адаптивная вёрстка для мобильных устройств
- ⚡ Совместимость с LuCI ucode (OpenWrt 23.x+)
- 📊 Виджет мониторинга сервисов на странице Status → Overview
- 🌐 Поддержка локализации (i18n)

## Виджет сервисов

На главной странице (Status → Overview) отображается виджет с состоянием системных сервисов:

- Визуализация статуса (Running/Stopped)
- Добавление сервисов через модальное окно или ввод имени
- Настройки сохраняются в браузере

## Настройки темы

Доступны в **System → System → Language and Style**:

- Акцентный цвет (Blue, Purple, Green, Orange, Red)
- Скругление углов
- Масштаб интерфейса
- Анимации и прозрачность
- Виджет сервисов (вкл/выкл, группировка, лог)

## Установка

### Быстрая установка

```bash
wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

Или:

```bash
curl -fsSL https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

### Сборка .ipk

```bash
cp -r luci-theme-proton2025 ~/openwrt/feeds/luci/themes/
cd ~/openwrt
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig  # LuCI -> Themes -> luci-theme-proton2025
make package/luci-theme-proton2025/compile V=s
```

## Удаление

```bash
wget -O uninstall.sh https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/uninstall.sh
chmod +x uninstall.sh
./uninstall.sh
```

### Откат на стандартную тему

```sh
uci set luci.main.mediaurlbase=/luci-static/bootstrap
uci commit luci
/etc/init.d/uhttpd restart
```

## Структура

```
luci-theme-proton2025/
├── Makefile
├── htdocs/luci-static/
│   ├── proton2025/
│   │   ├── cascade.css
│   │   ├── services-widget.js
│   │   └── logo.svg
│   └── resources/menu-proton2025.js
├── po/                              # Локализация
│   ├── ru/theme-proton2025.po
│   └── templates/theme-proton2025.pot
├── root/etc/uci-defaults/
└── ucode/template/themes/proton2025/
    ├── header.ut
    ├── footer.ut
    └── sysauth.ut
```

## Лицензия

Apache-2.0
