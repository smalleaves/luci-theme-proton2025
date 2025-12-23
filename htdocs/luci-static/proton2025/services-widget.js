/**
 * Proton2025 - Services Widget
 * Мониторинг сервисов с группировкой и поиском
 */

(function () {
  "use strict";

  class ProtonServicesWidget {
    constructor() {
      this.services = this.loadServices();

      // Категории сервисов
      this.categories = {
        network: { icon: "🌐", priority: 1 },
        security: { icon: "🛡️", priority: 2 },
        vpn: { icon: "🔒", priority: 3 },
        adblock: { icon: "🚫", priority: 4 },
        system: { icon: "⚙️", priority: 5 },
        other: { icon: "📦", priority: 99 },
      };

      // База известных сервисов с категориями
      // daemon: false - скрипты-настройщики без постоянного процесса (скрыты из списка выбора)
      this.knownServices = {
        // Сеть
        dnsmasq: { category: "network", icon: "🌐" },
        network: { category: "network", icon: "🔌", daemon: false },
        odhcpd: { category: "network", icon: "📡" },
        uhttpd: { category: "network", icon: "🌍" },
        nginx: { category: "network", icon: "🌍" },
        squid: { category: "network", icon: "🦑" },

        // Безопасность
        firewall: { category: "security", icon: "🔥", daemon: false },
        dropbear: { category: "security", icon: "🔐" },
        openssh: { category: "security", icon: "🔐" },
        sshd: { category: "security", icon: "🔐" },

        // VPN
        openvpn: { category: "vpn", icon: "🔒" },
        wireguard: { category: "vpn", icon: "🔒", daemon: false },
        zerotier: { category: "vpn", icon: "🔒" },
        tailscale: { category: "vpn", icon: "🔒" },
        shadowsocks: { category: "vpn", icon: "🔒" },
        v2ray: { category: "vpn", icon: "🔒" },
        xray: { category: "vpn", icon: "🔒" },
        clash: { category: "vpn", icon: "🔒" },
        passwall: { category: "vpn", icon: "🔒" },
        passwall2: { category: "vpn", icon: "🔒" },
        ssr: { category: "vpn", icon: "🔒" },
        trojan: { category: "vpn", icon: "🔒" },
        singbox: { category: "vpn", icon: "🔒" },
        "sing-box": { category: "vpn", icon: "🔒" },
        podkop: { category: "vpn", icon: "🔒", daemon: false },

        // AdBlock / DNS фильтрация
        adblock: { category: "adblock", icon: "🚫" },
        adguardhome: { category: "adblock", icon: "🛡️" },
        pihole: { category: "adblock", icon: "🕳️" },

        // Система
        cron: { category: "system", icon: "⏰" },
        sysntpd: { category: "system", icon: "🕐" },
        ntpd: { category: "system", icon: "🕐" },
        log: { category: "system", icon: "📝", daemon: false },
        syslog: { category: "system", icon: "📝" },
        rpcd: { category: "system", icon: "⚡" },
        ubus: { category: "system", icon: "🔗" },

        // Системные скрипты (скрыты)
        boot: { category: "system", icon: "🚀", daemon: false },
        done: { category: "system", icon: "✅", daemon: false },
        sysfixtime: { category: "system", icon: "🕐", daemon: false },
        sysctl: { category: "system", icon: "⚙️", daemon: false },
        led: { category: "system", icon: "💡", daemon: false },
        gpio_switch: { category: "system", icon: "🔘", daemon: false },
        umount: { category: "system", icon: "💾", daemon: false },
        urandom_seed: { category: "system", icon: "🎲", daemon: false },
        ucitrack: { category: "system", icon: "📋", daemon: false },
        bootcount: { category: "system", icon: "🔢", daemon: false },
        packet_steering: { category: "network", icon: "📡", daemon: false },
      };

      this.availableServices = [];
      this.checkInterval = null;
      this.pollIntervalMs = 10000;
      this.pollIntervalExecMs = 30000; // Увеличенный интервал для exec-режима
      this._onVisibilityChange = null;
      this._statusCache = new Map();
      this._serviceElements = new Map(); // Кэш DOM-элементов
      this._rcListAll = null;
      this._rcListOne = null;
      this._initdCache = null;
      this._initdCacheAt = 0;
      this._initdCacheTtlMs = 5 * 60 * 1000; // 5 минут
      this._initActionCache = new Map(); // serviceName -> 'running' | 'status'
      this._mounted = false;
      this._useExecMode = false; // Флаг использования медленного exec
      this._mutationObserver = null; // Для отслеживания удаления виджета
      this._updateQueue = []; // Очередь для последовательного опроса
      this._isUpdating = false;

      // Логирование: info (старт/конец цикла) всегда, debug (по сервисам) можно включить
      // localStorage['proton-services-widget-debug']='1' или window.protonServicesWidgetDebug=true
      this._debug =
        this._safeGetItem("proton-services-widget-debug") === "1" ||
        window.protonServicesWidgetDebug === true;

      // UI-лог (внизу секции виджета)
      this._uiLogLines = [];

      // Стартовый retry, если LuCI API (L.rpc/L.fs) ещё не готов
      this._backendRetryTimer = null;
      this._backendRetryAttempts = 0;
      this._backendRetryDelaysMs = [250, 500, 1000, 2000, 4000];
    }

    // ==================== Helpers ====================

    _safeGetItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }

    _safeSetItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }

    escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    _isValidServiceName(value) {
      // Жёсткое ограничение: имена init.d/rc обычно [A-Za-z0-9_-]
      // Запрещаем '/', '.', пробелы и прочее, чтобы не дать собрать путь.
      if (typeof value !== "string") return false;
      if (value.length < 1 || value.length > 64) return false;
      return /^[A-Za-z0-9_-]+$/.test(value);
    }

    _normalizeServiceList(list) {
      if (!Array.isArray(list)) return [];
      const out = [];
      const seen = new Set();
      for (const name of list) {
        if (!this._isValidServiceName(name)) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        out.push(name);
      }
      return out;
    }

    _logInfo(message, extra) {
      try {
        if (
          typeof console !== "undefined" &&
          console &&
          typeof console.info === "function"
        ) {
          if (typeof extra !== "undefined")
            console.info("[ProtonServicesWidget]", message, extra);
          else console.info("[ProtonServicesWidget]", message);
        }
      } catch (e) {}
    }

    _logDebug(message, extra) {
      if (!this._debug) return;
      try {
        if (
          typeof console !== "undefined" &&
          console &&
          typeof console.debug === "function"
        ) {
          if (typeof extra !== "undefined")
            console.debug("[ProtonServicesWidget]", message, extra);
          else console.debug("[ProtonServicesWidget]", message);
        }
      } catch (e) {}
    }

    _getUiLogEl() {
      return document.getElementById("proton-services-log");
    }

    _formatTime(d) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
        d.getSeconds()
      )}`;
    }

    _formatElapsedMs(ms) {
      if (typeof ms !== "number" || !isFinite(ms)) return "";
      if (ms < 1000) return `${Math.round(ms)}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    }

    _appendUiLogLine(text) {
      if (!text) return;
      const el = this._getUiLogEl();
      if (!el) return;

      const time = this._formatTime(new Date());
      this._uiLogLines.push({ time, text: String(text) });
      if (this._uiLogLines.length > 6)
        this._uiLogLines.splice(0, this._uiLogLines.length - 6);

      el.innerHTML = this._uiLogLines
        .map(
          (l) =>
            `<div class="proton-services-log-line"><span class="proton-services-log-time">${this.escapeHtml(
              l.time
            )}</span><span class="proton-services-log-text">${this.escapeHtml(
              l.text
            )}</span></div>`
        )
        .join("");
    }

    _clearBackendRetry() {
      if (this._backendRetryTimer) {
        clearTimeout(this._backendRetryTimer);
        this._backendRetryTimer = null;
      }
      this._backendRetryAttempts = 0;
    }

    _scheduleBackendRetry(reason) {
      if (!this._mounted) return;
      if (this._backendRetryTimer) return;
      if (this._backendRetryAttempts >= this._backendRetryDelaysMs.length)
        return;

      const delay =
        this._backendRetryDelaysMs[this._backendRetryAttempts++] || 1000;
      this._logDebug("Scheduling backend retry", { reason, delay });
      this._appendUiLogLine(
        `${this._t("Waiting for LuCI API...")} ${this._formatElapsedMs(delay)}`
      );

      this._backendRetryTimer = setTimeout(() => {
        this._backendRetryTimer = null;
        if (!this._mounted) return;
        // Не запускаем поверх текущей проверки
        if (this._isUpdating) return;
        this.updateAllStatuses();
      }, delay);
    }

    // ==================== Локализация ====================

    _t(key) {
      // Используем LuCI i18n если доступен
      if (window.L && L.tr) {
        const translated = L.tr(key);
        if (translated !== key) return translated;
      }
      // Fallback на английский (ключи уже на английском)
      return key;
    }

    getCategoryName(category) {
      const names = {
        network: this._t("Network"),
        security: this._t("Security"),
        vpn: this._t("VPN"),
        adblock: this._t("Ad Blocking"),
        system: this._t("System"),
        other: this._t("Other"),
      };
      return names[category] || category;
    }

    getServiceDescription(serviceName) {
      const descriptions = {
        dnsmasq: this._t("DNS and DHCP server"),
        firewall: this._t("Firewall"),
        network: this._t("Network interfaces"),
        uhttpd: this._t("LuCI web server"),
        odhcpd: this._t("DHCPv6 server"),
        dropbear: this._t("SSH access"),
        sysntpd: this._t("Time sync"),
        cron: this._t("Task scheduler"),
      };

      if (descriptions[serviceName]) return descriptions[serviceName];

      // Автоопределение по категории
      const info = this.knownServices[serviceName];
      if (info) {
        if (info.category === "vpn") return this._t("VPN service");
        if (info.category === "adblock") return this._t("Ad blocking");
      }

      return this._t("System service");
    }

    // ==================== Инициализация ====================

    init() {
      // Проверяем настройку отключения виджета
      if (this._safeGetItem("proton-services-widget-enabled") === "false") {
        return;
      }

      if (!this.isOverviewPage()) return;

      if (!this.injectWidget()) return;

      this.refreshAvailableServices()
        .then(() => this.renderServices())
        .catch(() => {});

      this.startStatusMonitoring();
    }

    isOverviewPage() {
      // Проверяем через dispatchpath (надёжнее чем data-page, который пустой на корневой странице)
      if (
        typeof L !== "undefined" &&
        L.env &&
        Array.isArray(L.env.dispatchpath)
      ) {
        const dp = L.env.dispatchpath;
        if (dp[0] === "admin" && dp[1] === "status" && dp[2] === "overview") {
          return true;
        }
      }
      return (
        document.body.dataset.page === "admin-status-overview" ||
        window.location.pathname.includes("/admin/status/overview")
      );
    }

    loadServices() {
      const saved = this._safeGetItem("proton-services-widget");
      if (!saved) return ["dnsmasq", "dropbear"];
      try {
        const parsed = JSON.parse(saved);
        const normalized = this._normalizeServiceList(parsed);
        return normalized.length ? normalized : ["dnsmasq", "dropbear"];
      } catch (e) {
        return ["dnsmasq", "dropbear"];
      }
    }

    saveServices() {
      this._safeSetItem(
        "proton-services-widget",
        JSON.stringify(this.services)
      );
    }

    // ==================== Виджет ====================

    injectWidget() {
      const maincontent = document.getElementById("maincontent");
      if (!maincontent) return false;

      // Prevent duplicate insertion
      const existing = document.getElementById("proton-services-widget");
      if (existing) {
        this._mounted = true;
        return true;
      }

      let insertPoint =
        maincontent.querySelector("h2") ||
        maincontent.querySelector("h3") ||
        maincontent.querySelector(".cbi-map") ||
        maincontent.firstElementChild;

      if (!insertPoint) return false;

      const widget = document.createElement("div");
      widget.className = "proton-services-widget";
      widget.id = "proton-services-widget";

      // Проверяем настройку отображения лога (по умолчанию выключен)
      const showLog = this._safeGetItem("proton-services-log") === "true";

      widget.innerHTML = `
                <div class="proton-services-header">
                    <h3 class="proton-services-title">${this._t(
                      "Services Monitor"
                    )}</h3>
                    <button class="proton-add-service-btn" title="${this._t(
                      "Add Service"
                    )}">+</button>
                </div>
                <div class="proton-services-grid" id="proton-services-grid"></div>
                <div class="proton-services-log" id="proton-services-log" aria-live="polite" style="${
                  showLog ? "" : "display:none"
                }"></div>
            `;

      insertPoint.parentNode.insertBefore(widget, insertPoint);

      this._mounted = true;

      const addBtn = widget.querySelector(".proton-add-service-btn");
      if (addBtn) {
        addBtn.addEventListener("click", () => this.showAddServiceModal());

        if (this.services.length === 0) {
          setTimeout(() => addBtn.classList.add("pulse"), 500);
        }
      }

      this.renderServices();

      this._appendUiLogLine(this._t("Ready"));

      return true;
    }

    getServiceInfo(serviceName) {
      const known = this.knownServices[serviceName] || {};
      return {
        name: serviceName,
        displayName: this.formatDisplayName(serviceName),
        description: this.getServiceDescription(serviceName),
        category: known.category || "other",
        icon: known.icon || "📦",
      };
    }

    formatDisplayName(name) {
      // Преобразуем имя в читаемый формат
      return name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    cssEscape(value) {
      if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
      }
      return String(value).replace(/["\\]/g, "\\$&");
    }

    renderServices() {
      const grid = document.getElementById("proton-services-grid");
      if (!grid) return;

      // Очищаем кэш элементов при полной перерисовке
      this._serviceElements.clear();
      grid.innerHTML = "";

      // Проверяем настройку группировки (по умолчанию выключена)
      const isGrouped = this._safeGetItem("proton-services-grouped") === "true";

      if (!isGrouped) {
        // Без группировки - просто показываем все сервисы
        this.services.forEach((serviceName) => {
          const info = this.getServiceInfo(serviceName);
          const card = this.createServiceCard({ ...info, serviceName });
          grid.appendChild(card);
        });
        this.updateAllStatuses();
        return;
      }

      // Группируем сервисы по категориям
      const grouped = new Map();

      this.services.forEach((serviceName) => {
        const info = this.getServiceInfo(serviceName);
        if (!grouped.has(info.category)) {
          grouped.set(info.category, []);
        }
        grouped.get(info.category).push({ ...info, serviceName });
      });

      // Сортируем категории по приоритету
      const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
        return (
          (this.categories[a]?.priority || 99) -
          (this.categories[b]?.priority || 99)
        );
      });

      // Рендерим по категориям
      sortedCategories.forEach((category) => {
        const services = grouped.get(category);
        const catInfo = this.categories[category] || {};

        // Заголовок категории (если больше одной категории)
        if (sortedCategories.length > 1 && services.length > 0) {
          const header = document.createElement("div");
          header.className = "proton-services-category-header";
          header.innerHTML = `<span>${
            catInfo.icon || ""
          } ${this.getCategoryName(category)}</span>`;
          grid.appendChild(header);
        }

        services.forEach((info) => {
          const card = this.createServiceCard(info);
          grid.appendChild(card);
        });
      });

      this.updateAllStatuses();
    }

    createServiceCard(info) {
      const card = document.createElement("div");
      card.className = "proton-service-card";
      card.dataset.service = info.serviceName;
      card.dataset.category = info.category;

      const safeDisplayName = this.escapeHtml(info.displayName);
      const safeDescription = this.escapeHtml(info.description);
      const safeIcon = this.escapeHtml(info.icon);

      card.innerHTML = `
                <div class="proton-service-card-header">
                    <span class="proton-service-icon">${safeIcon}</span>
                    <h4 class="proton-service-name">${safeDisplayName}</h4>
                    <button class="proton-service-remove" title="${this._t(
                      "Remove"
                    )}">×</button>
                </div>
                <div class="proton-service-status">
                    <span class="proton-service-status-dot" data-status="checking"></span>
                    <span class="proton-service-status-text">${this._t(
                      "Checking..."
                    )}</span>
                </div>
                <p class="proton-service-description">${safeDescription}</p>
            `;

      card
        .querySelector(".proton-service-remove")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeService(info.serviceName);
        });

      // Кэшируем ссылки на DOM-элементы для быстрого обновления
      this._serviceElements.set(info.serviceName, {
        card: card,
        dot: card.querySelector(".proton-service-status-dot"),
        text: card.querySelector(".proton-service-status-text"),
      });

      // Если статус уже известен из предыдущих проверок, применяем его к новому DOM.
      // Иначе после полной перерисовки карточки могут зависать на "Checking...".
      const cachedStatus = this._statusCache.get(info.serviceName);
      if (cachedStatus) {
        this.updateServiceCard(info.serviceName, cachedStatus);
      }

      return card;
    }

    // ==================== Модальное окно ====================

    async showAddServiceModal() {
      this._appendUiLogLine(this._t("Opening service list..."));
      const modal = document.createElement("div");
      modal.className = "proton-service-modal";
      modal.innerHTML = `
                <div class="proton-service-modal-content">
                    <div class="proton-service-modal-header">
                        <h3 class="proton-service-modal-title">${this._t(
                          "Add Service"
                        )}</h3>
                        <button class="proton-service-modal-close">×</button>
                    </div>
                    <div class="proton-service-search">
                        <input type="text" id="proton-service-search-input" 
                               placeholder="${this._t(
                                 "Search services..."
                               )}" autocomplete="off">
                    </div>
                    <div class="proton-service-list" id="proton-service-list"></div>
                    <div class="proton-service-custom">
                        <div class="proton-service-custom-input-wrap">
                            <input type="text" id="proton-custom-service-input" 
                                   placeholder="${this._t(
                                     "Enter custom service name..."
                                   )}" autocomplete="off" maxlength="64">
                            <span class="proton-service-custom-hint" id="proton-custom-hint"></span>
                        </div>
                        <button type="button" id="proton-custom-service-add" class="proton-service-item-add" disabled>${this._t(
                          "Add"
                        )}</button>
                    </div>
                </div>
            `;

      document.body.appendChild(modal);

      let onEscape;
      const closeModal = () => {
        modal.classList.remove("active");
        setTimeout(() => modal.remove(), 250);
        if (onEscape) {
          document.removeEventListener("keydown", onEscape);
          onEscape = null;
        }
      };

      modal
        .querySelector(".proton-service-modal-close")
        .addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      // Escape для закрытия
      onEscape = (e) => {
        if (e.key === "Escape") {
          closeModal();
        }
      };
      document.addEventListener("keydown", onEscape);

      // Добавление пользовательского сервиса
      const customInput = modal.querySelector("#proton-custom-service-input");
      const customAddBtn = modal.querySelector("#proton-custom-service-add");
      const customHint = modal.querySelector("#proton-custom-hint");

      const validateCustomInput = () => {
        const value = customInput.value.trim();
        const name = value.toLowerCase();

        // Сбрасываем состояние
        customInput.classList.remove("valid", "invalid");
        customHint.classList.remove("error", "success", "info");
        customHint.textContent = "";
        customAddBtn.disabled = true;

        if (!value) {
          customHint.textContent = this._t(
            "Letters, numbers, dash, underscore only"
          );
          customHint.classList.add("info");
          return false;
        }

        if (value.length > 64) {
          customHint.textContent = this._t("Name too long (max 64 chars)");
          customHint.classList.add("error");
          customInput.classList.add("invalid");
          return false;
        }

        if (!/^[A-Za-z0-9_-]+$/.test(value)) {
          customHint.textContent = this._t(
            "Invalid characters! Use: a-z, 0-9, -, _"
          );
          customHint.classList.add("error");
          customInput.classList.add("invalid");
          return false;
        }

        if (this.services.includes(name)) {
          customHint.textContent = this._t("Already in your list");
          customHint.classList.add("error");
          customInput.classList.add("invalid");
          return false;
        }

        // Проверяем есть ли в списке доступных
        const exists = this.availableServices.some((s) => s.name === name);
        if (exists) {
          customHint.textContent = "✓ " + this._t("Found in system");
          customHint.classList.add("success");
        } else {
          customHint.textContent = this._t(
            "Custom service (not found in system)"
          );
          customHint.classList.add("info");
        }

        customInput.classList.add("valid");
        customAddBtn.disabled = false;
        return true;
      };

      const addCustomService = () => {
        if (!validateCustomInput()) return;

        const name = customInput.value.trim().toLowerCase();
        this.addService(name);
        customInput.value = "";
        customHint.textContent = "✓ " + this._t("Added successfully!");
        customHint.classList.remove("info");
        customHint.classList.add("success");
        customAddBtn.disabled = true;

        setTimeout(() => {
          customHint.textContent = this._t(
            "Letters, numbers, dash, underscore only"
          );
          customHint.classList.remove("success");
          customHint.classList.add("info");
        }, 2000);
      };

      // Начальная подсказка
      customHint.textContent = this._t(
        "Letters, numbers, dash, underscore only"
      );
      customHint.classList.add("info");

      customInput.addEventListener("input", validateCustomInput);
      customAddBtn.addEventListener("click", addCustomService);
      customInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addCustomService();
        }
      });

      await this.refreshAvailableServices();

      const list = modal.querySelector("#proton-service-list");
      const searchInput = modal.querySelector("#proton-service-search-input");

      // Рендерим список с группировкой
      const initialCount = this.renderServiceList(list, "");
      this._appendUiLogLine(
        `${this._t("Available services")}: ${initialCount}`
      );

      // Поиск с debounce
      let searchTimeout;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const q = String(e.target.value || "").toLowerCase();
          const count = this.renderServiceList(list, q);
          if (q) {
            this._appendUiLogLine(`${this._t("Search")}: "${q}" - ${count}`);
          } else {
            this._appendUiLogLine(`${this._t("Available services")}: ${count}`);
          }
        }, 150);
      });

      setTimeout(() => {
        modal.classList.add("active");
        searchInput.focus();
      }, 10);
    }

    renderServiceList(container, filter) {
      container.innerHTML = "";

      let matchCount = 0;

      // Группируем по категориям
      const grouped = new Map();

      this.availableServices.forEach((service) => {
        const info = this.getServiceInfo(service.name);

        // Скрываем скрипты-настройщики (daemon: false)
        const knownInfo = this.knownServices[service.name];
        if (knownInfo && knownInfo.daemon === false) return;

        // Фильтрация по поиску
        if (filter) {
          const searchText =
            `${service.name} ${info.displayName} ${info.description}`.toLowerCase();
          if (!searchText.includes(filter)) return;
        }

        if (!grouped.has(info.category)) {
          grouped.set(info.category, []);
        }
        grouped
          .get(info.category)
          .push({ ...info, ...service, installed: service.fromInitd === true });
        matchCount++;
      });

      // Сортируем категории
      const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
        return (
          (this.categories[a]?.priority || 99) -
          (this.categories[b]?.priority || 99)
        );
      });

      if (sortedCategories.length === 0) {
        container.innerHTML = `<div class="proton-service-empty">${this._t(
          "No services found"
        )}</div>`;
        return 0;
      }

      sortedCategories.forEach((category) => {
        const services = grouped.get(category);
        const catInfo = this.categories[category] || {};

        // Заголовок категории
        const header = document.createElement("div");
        header.className = "proton-service-list-category";
        header.innerHTML = `${catInfo.icon || ""} ${this.getCategoryName(
          category
        )}`;
        container.appendChild(header);

        services.forEach((service) => {
          const isAdded = this.services.includes(service.name);
          const isInstalled = service.installed === true;

          const safeDisplayName = this.escapeHtml(service.displayName);
          const safeDescription = this.escapeHtml(service.description);
          const safeIcon = this.escapeHtml(service.icon);
          const safeNameAttr = this.escapeHtml(service.name);

          // Определяем текст и класс кнопки
          let btnClass = "proton-service-item-add";
          let btnText = "+ " + this._t("Add");
          if (!isInstalled) {
            btnClass += " not-installed";
            btnText = this._t("Not installed");
          } else if (isAdded) {
            btnClass += " added";
            btnText = "✓ " + this._t("Added");
          }

          const item = document.createElement("div");
          item.className = "proton-service-item";
          item.innerHTML = `
                        <div class="proton-service-item-info">
                            <span class="proton-service-item-icon">${safeIcon}</span>
                            <div>
                                <h4>${safeDisplayName}</h4>
                                <p>${safeDescription}</p>
                            </div>
                        </div>
                        <button class="${btnClass}" data-service="${safeNameAttr}">
                            ${btnText}
                        </button>
                    `;

          if (isInstalled && !isAdded) {
            const btn = item.querySelector(".proton-service-item-add");
            btn.addEventListener("click", () => {
              this.addService(service.name);
              btn.classList.add("added");
              btn.textContent = "✓ " + this._t("Added");
            });
          }

          container.appendChild(item);
        });
      });

      return matchCount;
    }

    // ==================== Управление сервисами ====================

    addService(serviceName) {
      if (!this._isValidServiceName(serviceName)) return;
      if (!this.services.includes(serviceName)) {
        this.services.push(serviceName);
        this.saveServices();
        this._statusCache.delete(serviceName);
        this._initActionCache.delete(serviceName);
        this._appendUiLogLine(`${this._t("Added")}: ${serviceName}`);
        this.renderServices();
      }
    }

    removeService(serviceName) {
      const index = this.services.indexOf(serviceName);
      if (index > -1) {
        this.services.splice(index, 1);
        this.saveServices();
        this._statusCache.delete(serviceName);
        this._initActionCache.delete(serviceName);
        this._appendUiLogLine(`${this._t("Removed")}: ${serviceName}`);

        // Инкрементальное удаление без полной перерисовки
        const cached = this._serviceElements.get(serviceName);
        if (cached && cached.card && cached.card.parentNode) {
          cached.card.remove();
          this._serviceElements.delete(serviceName);

          // Проверяем, нужно ли удалить пустые заголовки категорий
          this._cleanupEmptyCategoryHeaders();
        } else {
          // Fallback на полную перерисовку
          this.renderServices();
        }
      }
    }

    // Удаляет пустые заголовки категорий
    _cleanupEmptyCategoryHeaders() {
      const grid = document.getElementById("proton-services-grid");
      if (!grid) return;

      const headers = grid.querySelectorAll(".proton-services-category-header");
      headers.forEach((header) => {
        let nextEl = header.nextElementSibling;
        // Если следующий элемент - другой заголовок или конец, удаляем текущий
        if (
          !nextEl ||
          nextEl.classList.contains("proton-services-category-header")
        ) {
          header.remove();
        }
      });
    }

    // ==================== Обнаружение сервисов ====================

    discoverServicesFromMenu() {
      const out = [];
      const seen = new Set();

      const anchors = document.querySelectorAll(
        '#mainmenu a[href*="/admin/services/"]'
      );
      anchors.forEach((a) => {
        const href = a.getAttribute("href") || "";
        const m = href.match(/\/admin\/services\/(.+)$/);
        if (!m) return;
        const slug = decodeURIComponent(m[1]).split(/[?#]/)[0].split("/")[0];
        if (!this._isValidServiceName(slug)) return;
        if (!slug || slug === "services") return;
        if (seen.has(slug)) return;
        seen.add(slug);
        out.push({ name: slug, fromMenu: true });
      });

      return out;
    }

    async discoverServicesFromUbus() {
      const now = Date.now();
      // Используем кэш только если он НЕ пустой и не истёк
      if (
        this._initdCache &&
        this._initdCache.length > 0 &&
        now - this._initdCacheAt < this._initdCacheTtlMs
      ) {
        this._logDebug("Using cached init.d list", this._initdCache.length);
        return this._initdCache;
      }

      // Способ 1: Через RPC rc list (предпочтительный - работает если есть доступ к rc)
      if (window.L && L.resolveDefault && L.rpc) {
        try {
          if (!this._rcListAll) {
            this._rcListAll = L.rpc.declare({
              object: "rc",
              method: "list",
              params: [],
              expect: { "": {} },
            });
          }
          const allServices = await L.resolveDefault(this._rcListAll(), {});
          if (allServices && typeof allServices === "object") {
            const names = Object.keys(allServices);
            if (names.length > 0) {
              this._initdCache = names
                .filter((name) => this._isValidServiceName(name))
                .map((name) => ({ name, fromInitd: true }));
              this._initdCacheAt = now;
              this._logDebug(
                "Discovered services via rc list",
                this._initdCache.length
              );
              return this._initdCache;
            }
          }
        } catch (e) {
          this._logDebug("rc list error", e);
        }
      }

      // Способ 2: Через L.fs.list (fallback)
      if (window.L && L.fs && L.fs.list) {
        try {
          const files = await L.fs.list("/etc/init.d");
          this._logDebug("L.fs.list result", files);
          if (files && Array.isArray(files)) {
            this._initdCache = files
              .filter(
                (f) =>
                  f.type === "file" &&
                  !f.name.startsWith(".") &&
                  this._isValidServiceName(f.name)
              )
              .map((f) => ({ name: f.name, fromInitd: true }));
            this._initdCacheAt = now;
            this._logDebug(
              "Discovered init.d services via fs.list",
              this._initdCache.length
            );
            return this._initdCache;
          }
        } catch (e) {
          this._logDebug("L.fs.list error", e);
        }
      } else {
        this._logDebug("L.fs.list not available", {
          L: !!window.L,
          fs: !!(window.L && L.fs),
          list: !!(window.L && L.fs && L.fs.list),
        });
      }

      // Не кэшируем пустой результат - попробуем снова при следующем вызове
      this._logDebug("No services discovered, not caching");
      return [];
    }

    async refreshAvailableServices() {
      this._appendUiLogLine(this._t("Loading services..."));
      const merged = new Map();

      // Сначала читаем init.d - это даёт нам список реально установленных сервисов
      const initdServices = await this.discoverServicesFromUbus();
      const initdSet = new Set(initdServices.map((s) => s.name));

      // Логируем для отладки
      const initdCount = initdSet.size;
      if (initdCount === 0) {
        this._appendUiLogLine(this._t("Warning: init.d list empty"));
      } else {
        this._appendUiLogLine(`init.d: ${initdCount}`);
      }

      // Известные сервисы (добавляем fromInitd если найден в init.d)
      Object.keys(this.knownServices).forEach((name) => {
        if (this._isValidServiceName(name)) {
          merged.set(name, { name, fromInitd: initdSet.has(name) });
        }
      });

      // Из меню (добавляем fromInitd если найден в init.d)
      this.discoverServicesFromMenu().forEach((s) => {
        if (!merged.has(s.name)) {
          merged.set(s.name, { ...s, fromInitd: initdSet.has(s.name) });
        }
      });

      // Из init.d - добавляем остальные (которых нет в known/menu)
      initdServices.forEach((s) => {
        if (!merged.has(s.name)) merged.set(s.name, s);
      });

      this.availableServices = Array.from(merged.values());
      this._appendUiLogLine(
        `${this._t("Services loaded")}: ${this.availableServices.length}`
      );
    }

    // ==================== Проверка статуса ====================

    async updateAllStatuses() {
      if (!this._mounted) return;
      if (this._isUpdating) {
        this._logDebug("Skip: update already in progress");
        return;
      }
      this._isUpdating = true;

      const startedAt = Date.now();
      let mode = "unknown";
      this._logInfo("Checking services...");
      this._appendUiLogLine(this._t("Checking services..."));

      const hasRpc = !!(window.L && L.resolveDefault && L.rpc);
      const hasExec = !!(window.L && L.fs && L.fs.exec);

      try {
        if (!hasRpc && !hasExec) {
          mode = "none";
          for (const serviceName of this.services) {
            if (this._statusCache.get(serviceName) !== "unknown") {
              this._statusCache.set(serviceName, "unknown");
              this.updateServiceCard(serviceName, "unknown");
            }
          }

          // Частый кейс после reload: LuCI JS API ещё не готов.
          // Запланируем несколько коротких ретраев (не периодический таймер).
          this._scheduleBackendRetry("no-backend");
          return;
        }

        // Backend доступен - сбрасываем ретраи
        this._clearBackendRetry();

        if (hasRpc) {
          try {
            if (!this._rcListAll) {
              this._rcListAll = L.rpc.declare({
                object: "rc",
                method: "list",
                params: [],
                expect: { "": {} },
              });
            }
            const allServices = await L.resolveDefault(this._rcListAll(), {});

            // Проверяем, что RPC вернул валидные данные
            if (
              allServices &&
              typeof allServices === "object" &&
              Object.keys(allServices).length > 0
            ) {
              this._useExecMode = false; // RPC работает, используем быстрый режим
              mode = "rpc";

              for (const serviceName of this.services) {
                if (!this._isValidServiceName(serviceName)) continue;

                let status = "stopped";

                if (allServices[serviceName]) {
                  status =
                    allServices[serviceName].running === true
                      ? "running"
                      : "stopped";
                }

                if (this._statusCache.get(serviceName) !== status) {
                  this._statusCache.set(serviceName, status);
                  this.updateServiceCard(serviceName, status);
                }
              }
              return;
            }
          } catch (e) {}
        }

        // Fallback на exec-режим - используем последовательный опрос для снижения нагрузки
        this._useExecMode = true;
        mode = hasExec ? "exec" : hasRpc ? "rpc-empty" : "none";
        await this._updateStatusesSequentiallyNoLock();
      } finally {
        this._isUpdating = false;
        const elapsedMs = Date.now() - startedAt;
        this._logInfo("Check complete", { mode, elapsedMs });
        this._appendUiLogLine(
          `${this._t("Check complete")}: ${mode}${
            elapsedMs ? " - " + this._formatElapsedMs(elapsedMs) : ""
          }`
        );
      }
    }

    // Последовательное обновление статусов для снижения нагрузки на CPU
    async _updateStatusesSequentiallyNoLock() {
      for (const serviceName of this.services) {
        // Проверяем, не был ли виджет удален
        if (!this._mounted) break;
        if (!this._isValidServiceName(serviceName)) continue;

        this._logDebug("Checking service", serviceName);

        await this.updateServiceStatus(serviceName);

        this._logDebug("Checked service", serviceName);

        // Небольшая пауза между проверками для снижения нагрузки
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    async updateServiceStatus(serviceName) {
      try {
        const status = await this.checkServiceStatus(serviceName);
        if (this._statusCache.get(serviceName) !== status) {
          this._statusCache.set(serviceName, status);
          this.updateServiceCard(serviceName, status);
        }
      } catch (error) {
        if (this._statusCache.get(serviceName) !== "error") {
          this._statusCache.set(serviceName, "error");
          this.updateServiceCard(serviceName, "error");
        }
      }
    }

    async checkServiceStatus(serviceName) {
      try {
        if (!this._isValidServiceName(serviceName)) return "unknown";

        if (window.L && L.resolveDefault && L.rpc) {
          try {
            if (!this._rcListOne) {
              this._rcListOne = L.rpc.declare({
                object: "rc",
                method: "list",
                params: ["name"],
                expect: { "": {} },
              });
            }

            const result = await L.resolveDefault(
              this._rcListOne(serviceName),
              null
            );

            if (result && result[serviceName]) {
              if (result[serviceName].running === true) {
                return "running";
              }
              if (result[serviceName].enabled === true) {
                const initCheck = await this.checkViaInitScript(serviceName);
                if (initCheck === "running") return "running";
              }
              return "stopped";
            }
          } catch (e) {}
        }

        const initCheck = await this.checkViaInitScript(serviceName);
        if (initCheck !== null) return initCheck;

        return "unknown";
      } catch (error) {
        return "error";
      }
    }

    async checkViaInitScript(serviceName) {
      if (window.L && L.fs && L.fs.exec) {
        if (!this._isValidServiceName(serviceName)) return null;

        const path = "/etc/init.d/" + serviceName;
        const preferred = this._initActionCache.get(serviceName);

        const runAction = async (action) => {
          const result = await L.fs.exec(path, [action]);
          if (result && result.code === 0) return "running";
          if (result && typeof result.code === "number") return "stopped";
          return null;
        };

        // Если уже знаем рабочую команду - используем ровно один exec
        if (preferred === "running" || preferred === "status") {
          try {
            const res = await runAction(preferred);
            if (res !== null) return res;
          } catch (e) {
            this._initActionCache.delete(serviceName);
          }
        }

        // Пробуем "running", затем "status" и кэшируем удачную
        try {
          const res = await runAction("running");
          if (res !== null) {
            this._initActionCache.set(serviceName, "running");
            return res;
          }
        } catch (e) {}

        try {
          const res = await runAction("status");
          if (res !== null) {
            this._initActionCache.set(serviceName, "status");
            return res;
          }
        } catch (e) {}
      }
      return null;
    }

    updateServiceCard(serviceName, status) {
      // Используем кэшированные элементы вместо querySelector
      const cached = this._serviceElements.get(serviceName);
      if (!cached || !cached.card) return;

      const { dot, text } = cached;

      dot.className = "proton-service-status-dot " + status;
      text.className = "proton-service-status-text " + status;

      const statusTexts = {
        running: this._t("Running"),
        stopped: this._t("Stopped"),
        error: this._t("Error"),
        unknown: this._t("Unknown"),
      };
      text.textContent = statusTexts[status] || status;
    }

    // ==================== Мониторинг ====================

    startStatusMonitoring() {
      if (!this._mounted) return;

      this._setupMutationObserver();
      // Таймерный опрос отключён по требованию: обновления происходят
      // при первичном рендере, при действиях пользователя и при возврате на вкладку.

      if (!this._onVisibilityChange) {
        let lastVisibleTime = Date.now();
        this._onVisibilityChange = () => {
          if (document.hidden) {
            lastVisibleTime = Date.now();
            return;
          }
          const elapsed = Date.now() - lastVisibleTime;
          if (elapsed > 3000) {
            this.updateAllStatuses();
          }
        };
        document.addEventListener("visibilitychange", this._onVisibilityChange);
      }
    }

    // Планируем следующее обновление с динамическим интервалом
    _scheduleNextUpdate() {
      if (this.checkInterval) {
        clearTimeout(this.checkInterval);
        this.checkInterval = null;
      }

      if (!this._mounted) return;

      // Используем увеличенный интервал в exec-режиме
      const interval = this._useExecMode
        ? this.pollIntervalExecMs
        : this.pollIntervalMs;

      this.checkInterval = setTimeout(() => {
        if (document.hidden) {
          this._scheduleNextUpdate();
          return;
        }
        this.updateAllStatuses().finally(() => {
          this._scheduleNextUpdate();
        });
      }, interval);
    }

    // MutationObserver для автоматической очистки при удалении виджета из DOM
    _setupMutationObserver() {
      if (this._mutationObserver) return;

      const widget = document.getElementById("proton-services-widget");
      if (!widget || !widget.parentNode) return;

      this._mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const removed of mutation.removedNodes) {
            if (
              removed === widget ||
              (removed.contains && removed.contains(widget))
            ) {
              this.stop();
              return;
            }
          }
        }
      });

      this._mutationObserver.observe(widget.parentNode, {
        childList: true,
        subtree: true,
      });
    }

    stop() {
      this._mounted = false;

      this._clearBackendRetry();

      if (this.checkInterval) {
        clearTimeout(this.checkInterval);
        this.checkInterval = null;
      }

      if (this._onVisibilityChange) {
        document.removeEventListener(
          "visibilitychange",
          this._onVisibilityChange
        );
        this._onVisibilityChange = null;
      }

      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
      }

      this._statusCache.clear();
      this._serviceElements.clear();
      this._initActionCache.clear();
      this._updateQueue = [];
      this._isUpdating = false;
    }
  }

  // Инициализация
  function initWidget() {
    // Avoid duplicate instances and timers
    if (window.protonServicesWidget && window.protonServicesWidget._mounted) {
      return;
    }
    if (
      window.protonServicesWidget &&
      typeof window.protonServicesWidget.stop === "function"
    ) {
      window.protonServicesWidget.stop();
    }
    window.protonServicesWidget = new ProtonServicesWidget();
    window.protonServicesWidget.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    if (document.getElementById("maincontent")) {
      initWidget();
    } else {
      setTimeout(initWidget, 100);
    }
  }
})();
