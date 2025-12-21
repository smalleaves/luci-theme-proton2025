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
- 🎨 Единая система CSS-переменных для кастомизации
- 📱 Адаптивная вёрстка (мобильные карточки для таблиц)
- ⚡ Совместимость с LuCI ucode (OpenWrt 23.x+)
- ⚙️ Встроенные настройки темы (System → System → Language and Style)

## Настройки темы

Тема включает встроенную панель настроек, доступную в разделе **System → System → Language and Style**:

| Настройка         | Описание                                                 |
| ----------------- | -------------------------------------------------------- |
| **Accent Color**  | Выбор акцентного цвета: Blue, Purple, Green, Orange, Red |
| **Border Radius** | Стиль скругления углов: Sharp, Rounded, Extra Rounded    |
| **Zoom**          | Масштаб интерфейса (75% - 150%), как Ctrl+/- в браузере  |
| **Animations**    | Включение/отключение анимаций и переходов                |
| **Transparency**  | Эффект размытия и прозрачности для панели меню           |

Все настройки сохраняются в браузере (localStorage) и применяются автоматически при загрузке страницы.

## Установка

### 🚀 Быстрая установка (Для теста)

Подключитесь к роутеру по SSH и выполните:

```bash
wget -qO- https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

Или с curl:

```bash
curl -fsSL https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/install.sh | sh
```

### Сборка .ipk (OpenWrt Buildroot)

```bash
cp -r luci-theme-proton2025 ~/openwrt/feeds/luci/themes/
cd ~/openwrt
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig  # LuCI -> Themes -> luci-theme-proton2025
make package/luci-theme-proton2025/compile V=s
```

## Удаление

### Быстрое удаление

```bash
# 1. Скачайте скрипт
wget -O uninstall.sh https://raw.githubusercontent.com/ChesterGoodiny/luci-theme-proton2025/main/uninstall.sh

# 2. Сделайте его исполняемым (на всякий случай)
chmod +x uninstall.sh

# 3. Запустите напрямую — теперь он будет интерактивным
./uninstall.sh
```

### Откат на стандартную тему (без удаления)

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
│   │   ├── logo.svg
│   │   └── spinner.svg
│   └── resources/menu-proton2025.js
├── root/etc/uci-defaults/30_luci-theme-proton2025
└── ucode/template/themes/proton2025/
    ├── header.ut
    ├── footer.ut
    └── sysauth.ut
```

## Лицензия

Apache-2.0
