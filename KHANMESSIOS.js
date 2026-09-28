(() => {
    "use strict";

    /*
     * ============================================================
     * KHANMESSIAS V4.1.0
     * ============================================================
     * Interface de produtividade/navegação para Khan Academy.
     *
     * Inclui:
     * - Menu flutuante
     * - Dashboard
     * - Recomendações encontradas na página
     * - Fila de estudos persistente
     * - Abrir próximo item
     * - Modo foco com cronômetro
     * - Tema claro/escuro/sistema
     * - Modo compacto
     * - Acessibilidade
     * - Diagnóstico
     * - MutationObserver
     * - Detecção de navegação SPA
     * - localStorage
     *
     * Não implementa respostas automáticas, falsificação de
     * progresso ou mecanismos para burlar exercícios.
     * ============================================================
     */

    const VERSION = "V4.1.0";
    const APP_NAME = "KhanMESSIAS";
    const STORAGE_KEY = "khanmessias:v4:settings";
    const QUEUE_KEY = "khanmessias:v4:queue";
    const INSTANCE_KEY = "__KHANMESSIAS_INSTANCE__";

    if (window[INSTANCE_KEY]?.destroy) {
        try {
            window[INSTANCE_KEY].destroy();
        } catch (_) {}
    }

    const state = {
        open: false,
        page: "dashboard",
        observer: null,
        routeTimer: null,
        focusTimerId: null,
        focusTimer: false,
        focusSeconds: 0,
        lastUrl: location.href,
        destroyed: false,

        settings: {
            theme: "system",
            compact: false,
            notifications: true,
            recommendations: true,
            accessibility: true,
            autoRefresh: true,
            refreshSeconds: 15,
            reduceMotion: false,
            largeText: false
        },

        queue: []
    };

    const features = {
        dashboard: true,
        recommendations: true,
        studyQueue: true,
        focusMode: true,
        accessibility: true,
        autoRefresh: true,

        // Compatibilidade nominal com versões antigas.
        // Não são implementados como bypass/cheat.
        questionSpoof: false,
        videoSpoof: false,
        autoAnswer: false,
        customBanner: false,
        nextRecomendation: true,
        repeatQuestion: false,
        minuteFarmer: false,
        rgbLogo: false
    };

    window.features = features;
    window.featureConfigs = state.settings;

    const log = (...args) =>
        console.info(`[${APP_NAME} ${VERSION}]`, ...args);

    const warn = (...args) =>
        console.warn(`[${APP_NAME} ${VERSION}]`, ...args);

    const error = (...args) =>
        console.error(`[${APP_NAME} ${VERSION}]`, ...args);

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function loadSettings() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "null"
            );

            if (saved && typeof saved === "object") {
                Object.assign(state.settings, saved);
            }
        } catch (e) {
            warn("Não foi possível carregar as configurações.", e);
        }

        try {
            const queue = JSON.parse(
                localStorage.getItem(QUEUE_KEY) || "[]"
            );

            if (Array.isArray(queue)) {
                state.queue = queue.slice(0, 50);
            }
        } catch (e) {
            warn("Não foi possível carregar a fila.", e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state.settings)
            );
        } catch (e) {
            warn("Não foi possível salvar as configurações.", e);
        }
    }

    function saveQueue() {
        try {
            localStorage.setItem(
                QUEUE_KEY,
                JSON.stringify(state.queue)
            );
        } catch (e) {
            warn("Não foi possível salvar a fila.", e);
        }
    }

    function toast(message, duration = 3000) {
        if (!state.settings.notifications) return;

        const box = document.createElement("div");

        box.className = "km-toast";
        box.textContent = message;

        document.body.appendChild(box);

        requestAnimationFrame(() => {
            box.classList.add("km-toast-show");
        });

        setTimeout(() => {
            box.classList.remove("km-toast-show");

            setTimeout(() => {
                box.remove();
            }, 220);
        }, duration);
    }

    const Adapter = {
        getTitle() {
            return document.title || "Khan Academy";
        },

        getUrl() {
            return location.href;
        },

        getMain() {
            return (
                document.querySelector("main") ||
                document.querySelector('[role="main"]') ||
                document.body
            );
        },

        getNavigation() {
            return (
                document.querySelector("nav") ||
                document.querySelector('[role="navigation"]')
            );
        },

        getVisibleLinks() {
            return [...document.querySelectorAll("a[href]")]
                .filter(a => {
                    const rect = a.getBoundingClientRect();
                    const style = getComputedStyle(a);

                    return (
                        rect.width > 0 &&
                        rect.height > 0 &&
                        style.display !== "none" &&
                        style.visibility !== "hidden"
                    );
                });
        },

        getStudyLinks() {
            const keywords = [
                "practice",
                "exercise",
                "lesson",
                "course",
                "quiz",
                "unit",
                "article",
                "skill",
                "mastery",
                "learn",

                "prática",
                "exercício",
                "lição",
                "curso",
                "questionário",
                "unidade",
                "artigo",
                "habilidade",
                "aprender"
            ];

            const ignored = [
                "/login",
                "/signup",
                "/settings",
                "/profile/me",
                "mailto:",
                "javascript:"
            ];

            const seen = new Set();
            const results = [];

            for (const link of this.getVisibleLinks()) {
                const href = link.href;

                const text = (
                    link.innerText ||
                    link.getAttribute("aria-label") ||
                    ""
                ).trim();

                const haystack =
                    `${text} ${href}`.toLowerCase();

                if (!href) continue;

                if (ignored.some(x => href.includes(x))) {
                    continue;
                }

                if (!keywords.some(k => haystack.includes(k))) {
                    continue;
                }

                let url;

                try {
                    url = new URL(
                        href,
                        location.href
                    ).href;
                } catch (_) {
                    continue;
                }

                if (
                    url.startsWith("javascript:") ||
                    seen.has(url)
                ) {
                    continue;
                }

                seen.add(url);

                results.push({
                    title:
                        text ||
                        this.cleanUrlTitle(url),

                    url
                });

                if (results.length >= 30) {
                    break;
                }
            }

            return results;
        },

        cleanUrlTitle(url) {
            try {
                const u = new URL(url);

                const part =
                    u.pathname
                        .split("/")
                        .filter(Boolean)
                        .pop();

                return decodeURIComponent(
                    part || u.hostname
                )
                    .replaceAll("-", " ")
                    .replaceAll("_", " ");
            } catch (_) {
                return url;
            }
        },

        getPageSummary() {
            const main = this.getMain();

            const text = (
                main?.innerText || ""
            )
                .replace(/\s+/g, " ")
                .trim();

            return text.slice(0, 600);
        }
    };

    const Queue = {
        has(url) {
            return state.queue.some(
                item => item.url === url
            );
        },

        add(item) {
            if (!item?.url) {
                return false;
            }

            if (this.has(item.url)) {
                toast("Esse item já está na fila.");
                return false;
            }

            state.queue.push({
                title: String(
                    item.title || "Estudo"
                ).slice(0, 180),

                url: item.url,

                addedAt: Date.now()
            });

            if (state.queue.length > 50) {
                state.queue.shift();
            }

            saveQueue();

            toast("Adicionado à fila.");

            renderCurrentPage();

            return true;
        },

        remove(index) {
            if (
                index < 0 ||
                index >= state.queue.length
            ) {
                return;
            }

            state.queue.splice(index, 1);

            saveQueue();

            renderCurrentPage();
        },

        clear() {
            state.queue = [];

            saveQueue();

            toast("Fila limpa.");

            renderCurrentPage();
        },

        next() {
            const item = state.queue[0];

            if (!item) {
                toast("A fila está vazia.");
                return;
            }

            state.queue.shift();

            saveQueue();

            location.href = item.url;
        }
    };

    const Theme = {
        apply() {
            const app =
                document.getElementById("km-app");

            if (!app) {
                return;
            }

            app.classList.remove("km-dark");

            let dark = false;

            if (state.settings.theme === "dark") {
                dark = true;
            }

            if (
                state.settings.theme === "system" &&
                matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
            ) {
                dark = true;
            }

            if (dark) {
                app.classList.add("km-dark");
            }

            app.classList.toggle(
                "km-compact",
                !!state.settings.compact
            );

            app.classList.toggle(
                "km-large-text",
                !!state.settings.largeText
            );

            app.classList.toggle(
                "km-reduce-motion",
                !!state.settings.reduceMotion
            );
        }
    };

    function injectStyles() {
        if (document.getElementById("km-style")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "km-style";

        style.textContent = `
            #km-app,
            #km-app * {
                box-sizing: border-box;
            }

            #km-app {
                --km-bg: #fff;
                --km-panel: #f5f7f9;
                --km-text: #202124;
                --km-muted: #687078;
                --km-border: #dfe3e7;
                --km-accent: #14a05a;
                --km-accent-hover: #10894d;
                --km-danger: #d93025;
                --km-shadow:
                    0 18px 55px rgba(0,0,0,.20);

                position: fixed;
                z-index: 2147483000;

                top: 70px;
                right: 20px;

                width:
                    min(
                        820px,
                        calc(100vw - 30px)
                    );

                height:
                    min(
                        680px,
                        calc(100vh - 90px)
                    );

                display: none;

                overflow: hidden;

                border:
                    1px solid var(--km-border);

                border-radius: 18px;

                background:
                    var(--km-bg);

                color:
                    var(--km-text);

                box-shadow:
                    var(--km-shadow);

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;

                font-size: 14px;
            }

            #km-app.km-open {
                display: flex;
            }

            #km-app.km-dark {
                --km-bg: #17191c;
                --km-panel: #22262a;
                --km-text: #f2f4f5;
                --km-muted: #aab1b8;
                --km-border: #353a40;
                --km-shadow:
                    0 22px 65px rgba(0,0,0,.55);
            }

            #km-app.km-large-text {
                font-size: 16px;
            }

            #km-app.km-compact {
                width:
                    min(
                        680px,
                        calc(100vw - 30px)
                    );

                height:
                    min(
                        580px,
                        calc(100vh - 90px)
                    );
            }

            .km-sidebar {
                width: 190px;
                flex: 0 0 190px;

                padding: 12px;

                display: flex;
                flex-direction: column;

                gap: 5px;

                background:
                    var(--km-panel);

                border-right:
                    1px solid var(--km-border);
            }

            .km-brand {
                padding:
                    12px 9px 17px;

                font-size: 18px;
                font-weight: 800;
            }

            .km-brand b {
                color:
                    var(--km-accent);
            }

            .km-nav {
                width: 100%;

                border: 0;

                border-radius: 10px;

                padding: 10px;

                text-align: left;

                background: transparent;

                color:
                    var(--km-muted);

                cursor: pointer;

                font: inherit;
            }

            .km-nav:hover {
                background:
                    var(--km-bg);

                color:
                    var(--km-text);
            }

            .km-nav.km-active {
                background:
                    var(--km-accent);

                color: #fff;
            }

            .km-spacer {
                flex: 1;
            }

            .km-main {
                min-width: 0;
                flex: 1;

                display: flex;
                flex-direction: column;
            }

            .km-header {
                min-height: 60px;

                padding:
                    0 16px;

                display: flex;

                align-items: center;

                justify-content:
                    space-between;

                border-bottom:
                    1px solid var(--km-border);
            }

            .km-title {
                font-weight: 800;
            }

            .km-actions {
                display: flex;
                gap: 6px;
            }

            .km-icon {
                width: 34px;
                height: 34px;

                border: 0;

                border-radius: 9px;

                background:
                    var(--km-panel);

                color:
                    var(--km-text);

                cursor: pointer;

                font: inherit;
            }

            .km-content {
                flex: 1;

                overflow: auto;

                padding: 18px;
            }

            .km-card {
                padding: 15px;

                margin-bottom: 12px;

                border:
                    1px solid var(--km-border);

                border-radius: 14px;

                background:
                    var(--km-bg);
            }

            .km-card h3 {
                margin:
                    0 0 6px;

                font-size: 16px;
            }

            .km-muted {
                color:
                    var(--km-muted);

                font-size: 13px;
            }

            .km-grid {
                display: grid;

                grid-template-columns:
                    repeat(
                        2,
                        minmax(0, 1fr)
                    );

                gap: 10px;
            }

            .km-stat {
                padding: 14px;

                border-radius: 12px;

                background:
                    var(--km-panel);
            }

            .km-stat strong {
                display: block;

                margin-top: 4px;

                font-size: 20px;
            }

            .km-row {
                display: flex;

                align-items: center;

                justify-content:
                    space-between;

                gap: 10px;
            }

            .km-buttons {
                display: flex;

                flex-wrap: wrap;

                gap: 7px;
            }

            .km-btn {
                border: 0;

                border-radius: 9px;

                padding:
                    9px 12px;

                background:
                    var(--km-accent);

                color: white;

                cursor: pointer;

                font: inherit;

                font-weight: 700;
            }

            .km-btn:hover {
                background:
                    var(--km-accent-hover);
            }

            .km-btn.secondary {
                background:
                    var(--km-panel);

                color:
                    var(--km-text);
            }

            .km-btn.danger {
                background:
                    var(--km-danger);
            }

            .km-item {
                padding:
                    12px 0;

                border-bottom:
                    1px solid var(--km-border);
            }

            .km-item:last-child {
                border-bottom: 0;
            }

            .km-item-title {
                font-weight: 700;

                word-break:
                    break-word;
            }

            .km-item-url {
                margin-top: 4px;

                color:
                    var(--km-muted);

                font-size: 11px;

                word-break:
                    break-all;
            }

            .km-setting {
                padding:
                    12px 0;

                border-bottom:
                    1px solid var(--km-border);
            }

            .km-setting:last-child {
                border-bottom: 0;
            }

            .km-select {
                padding: 8px;

                border:
                    1px solid var(--km-border);

                border-radius: 8px;

                background:
                    var(--km-bg);

                color:
                    var(--km-text);
            }

            .km-toggle {
                width: 42px;
                height: 23px;

                border: 0;

                border-radius: 999px;

                background:
                    #969da4;

                cursor: pointer;

                position: relative;
            }

            .km-toggle::after {
                content: "";

                position: absolute;

                width: 17px;
                height: 17px;

                top: 3px;
                left: 3px;

                border-radius: 50%;

                background: #fff;

                transition:
                    .16s;
            }

            .km-toggle.km-on {
                background:
                    var(--km-accent);
            }

            .km-toggle.km-on::after {
                transform:
                    translateX(19px);
            }

            .km-empty {
                padding:
                    35px 10px;

                text-align: center;

                color:
                    var(--km-muted);
            }

            .km-diagnostic {
                padding: 12px;

                overflow: auto;

                border-radius: 10px;

                background:
                    var(--km-panel);

                font:
                    12px/1.55
                    ui-monospace,
                    SFMono-Regular,
                    Menlo,
                    monospace;

                white-space:
                    pre-wrap;

                word-break:
                    break-word;
            }

            .km-focus {
                text-align: center;

                padding:
                    28px 10px;
            }

            .km-focus-time {
                margin:
                    10px 0 20px;

                font-size: 52px;

                font-weight: 800;

                letter-spacing: 2px;
            }

            #km-launcher {
                position: fixed;

                z-index: 2147482999;

                right: 18px;
                bottom: 18px;

                width: 50px;
                height: 50px;

                border: 0;

                border-radius: 50%;

                background:
                    #14a05a;

                color: #fff;

                cursor: pointer;

                box-shadow:
                    0 8px 25px rgba(0,0,0,.25);

                font:
                    800 20px system-ui;
            }

            .km-toast {
                position: fixed;

                z-index: 2147483647;

                left: 50%;

                bottom: 22px;

                max-width:
                    calc(100vw - 30px);

                padding:
                    11px 15px;

                border-radius: 10px;

                background:
                    #202124;

                color: #fff;

                opacity: 0;

                transform:
                    translate(-50%, 8px);

                transition:
                    opacity .2s,
                    transform .2s;

                pointer-events: none;

                font:
                    13px system-ui;
            }

            .km-toast-show {
                opacity: 1;

                transform:
                    translate(-50%, 0);
            }

            .km-reduce-motion *,
            .km-reduce-motion *::before,
            .km-reduce-motion *::after {
                transition:
                    none !important;

                animation:
                    none !important;
            }

            @media (max-width: 650px) {
                #km-app {
                    top: 8px;
                    right: 8px;

                    width:
                        calc(100vw - 16px);

                    height:
                        calc(100vh - 16px);

                    border-radius:
                        14px;
                }

                .km-sidebar {
                    width: 58px;

                    flex-basis: 58px;

                    padding: 8px;
                }

                .km-brand {
                    text-align: center;

                    font-size: 0;
                }

                .km-brand::before {
                    content: "K";

                    font-size: 20px;
                }

                .km-nav {
                    padding:
                        10px 5px;

                    text-align: center;

                    font-size: 0;
                }

                .km-nav::first-letter {
                    font-size: 18px;
                }

                .km-grid {
                    grid-template-columns:
                        1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function buildUI() {
        document.getElementById("km-app")?.remove();
        document.getElementById("km-launcher")?.remove();

        const launcher =
            document.createElement("button");

        launcher.id = "km-launcher";
        launcher.title = "Abrir KhanMESSIAS";
        launcher.textContent = "K";

        launcher.addEventListener(
            "click",
            toggle
        );

        document.body.appendChild(launcher);

        const app =
            document.createElement("section");

        app.id = "km-app";

        app.setAttribute(
            "aria-label",
            "KhanMESSIAS"
        );

        app.innerHTML = `
            <aside class="km-sidebar">

                <div class="km-brand">
                    Khan<b>MESSIAS</b>
                </div>

                <button
                    class="km-nav km-active"
                    data-page="dashboard">
                    🏠 Painel
                </button>

                <button
                    class="km-nav"
                    data-page="recommendations">
                    📚 Recomendações
                </button>

                <button
                    class="km-nav"
                    data-page="queue">
                    📋 Fila
                </button>

                <button
                    class="km-nav"
                    data-page="focus">
                    ⏱️ Foco
                </button>

                <button
                    class="km-nav"
                    data-page="accessibility">
                    ♿ Acessibilidade
                </button>

                <div class="km-spacer"></div>

                <button
                    class="km-nav"
                    data-page="settings">
                    ⚙️ Configurações
                </button>

                <button
                    class="km-nav"
                    data-page="diagnostics">
                    🧪 Diagnóstico
                </button>

            </aside>

            <div class="km-main">

                <header class="km-header">

                    <div
                        class="km-title"
                        id="km-page-title">
                        Painel
                    </div>

                    <div class="km-actions">

                        <button
                            class="km-icon"
                            id="km-refresh"
                            title="Atualizar">
                            ↻
                        </button>

                        <button
                            class="km-icon"
                            id="km-close"
                            title="Fechar">
                            ×
                        </button>

                    </div>

                </header>

                <div
                    class="km-content"
                    id="km-content">
                </div>

            </div>
        `;

        document.body.appendChild(app);

        app.querySelectorAll(".km-nav")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        state.page =
                            button.dataset.page;

                        renderCurrentPage();
                    }
                );
            });

        document
            .getElementById("km-close")
            .addEventListener(
                "click",
                close
            );

        document
            .getElementById("km-refresh")
            .addEventListener(
                "click",
                () => {
                    renderCurrentPage();
                    toast("Painel atualizado.");
                }
            );

        Theme.apply();
    }

    function open() {
        state.open = true;

        document
            .getElementById("km-app")
            ?.classList.add("km-open");

        renderCurrentPage();
    }

    function close() {
        state.open = false;

        document
            .getElementById("km-app")
            ?.classList.remove("km-open");
    }

    function toggle() {
        state.open
            ? close()
            : open();
    }

    function setPageTitle(title) {
        const el =
            document.getElementById(
                "km-page-title"
            );

        if (el) {
            el.textContent = title;
        }
    }

    function dashboardHTML() {
        const links =
            Adapter.getStudyLinks();

        return `
            <div class="km-card">

                <h3>
                    KhanMESSIAS ${VERSION}
                </h3>

                <div class="km-muted">
                    Ferramentas de organização,
                    navegação e produtividade.
                </div>

            </div>

            <div class="km-grid">

                <div class="km-stat">
                    <span class="km-muted">
                        Itens na fila
                    </span>

                    <strong>
                        ${state.queue.length}
                    </strong>
                </div>

                <div class="km-stat">
                    <span class="km-muted">
                        Links de estudo encontrados
                    </span>

                    <strong>
                        ${links.length}
                    </strong>
                </div>

                <div class="km-stat">
                    <span class="km-muted">
                        Página atual
                    </span>

                    <strong>
                        ${escapeHTML(
                            document.title
                        ).slice(0, 30)}
                    </strong>
                </div>

                <div class="km-stat">
                    <span class="km-muted">
                        Versão
                    </span>

                    <strong>
                        ${VERSION}
                    </strong>
                </div>

            </div>

            <div class="km-card">

                <h3>
                    Ações rápidas
                </h3>

                <div class="km-buttons">

                    <button
                        class="km-btn"
                        data-action="recommendations">
                        Ver recomendações
                    </button>

                    <button
                        class="km-btn secondary"
                        data-action="next">
                        Abrir próximo da fila
                    </button>

                    <button
                        class="km-btn secondary"
                        data-action="focus">
                        Modo foco
                    </button>

                </div>

            </div>

            <div class="km-card">

                <h3>
                    Página detectada
                </h3>

                <div class="km-muted">
                    ${escapeHTML(
                        location.href
                    )}
                </div>

            </div>
        `;
    }

    function recommendationsHTML() {
        if (!features.recommendations) {
            return `
                <div class="km-empty">
                    Recomendações desativadas.
                </div>
            `;
        }

        const items =
            Adapter.getStudyLinks();

        if (!items.length) {
            return `
                <div class="km-empty">
                    Nenhum link de estudo foi
                    encontrado na parte visível
                    da página.

                    <br><br>

                    Navegue até uma área de
                    curso/exercício e atualize
                    este painel.
                </div>
            `;
        }

        return items
            .map(
                (item, index) => `
                    <div class="km-item">

                        <div class="km-item-title">
                            ${index + 1}.
                            ${escapeHTML(item.title)}
                        </div>

                        <div class="km-item-url">
                            ${escapeHTML(item.url)}
                        </div>

                        <div
                            class="km-buttons"
                            style="margin-top:9px">

                            <button
                                class="km-btn"
                                data-open-url="${encodeURIComponent(
                                    item.url
                                )}">
                                Abrir
                            </button>

                            <button
                                class="km-btn secondary"
                                data-add-url="${encodeURIComponent(
                                    item.url
                                )}"
                                data-add-title="${encodeURIComponent(
                                    item.title
                                )}">
                                Adicionar à fila
                            </button>

                        </div>

                    </div>
                `
            )
            .join("");
    }

    function queueHTML() {
        if (!state.queue.length) {
            return `
                <div class="km-empty">

                    Sua fila está vazia.

                    <br><br>

                    Adicione itens na aba
                    Recomendações.

                </div>
            `;
        }

        return `
            <div class="km-card">

                <div class="km-row">

                    <div>

                        <h3 style="margin:0">
                            Fila de estudos
                        </h3>

                        <div class="km-muted">
                            ${state.queue.length}
                            item(ns)
                        </div>

                    </div>

                    <button
                        class="km-btn danger"
                        data-action="clear-queue">
                        Limpar
                    </button>

                </div>

            </div>

            ${state.queue
                .map(
                    (item, index) => `
                        <div class="km-item">

                            <div
                                class="km-item-title">
                                ${index + 1}.
                                ${escapeHTML(
                                    item.title
                                )}
                            </div>

                            <div
                                class="km-item-url">
                                ${escapeHTML(
                                    item.url
                                )}
                            </div>

                            <div
                                class="km-buttons"
                                style="margin-top:9px">

                                <button
                                    class="km-btn"
                                    data-open-queue="${index}">
                                    Abrir
                                </button>

                                <button
                                    class="km-btn secondary"
                                    data-remove-queue="${index}">
                                    Remover
                                </button>

                            </div>

                        </div>
                    `
                )
                .join("")}
        `;
    }

    function focusHTML() {
        const mins =
            Math.floor(
                state.focusSeconds / 60
            )
                .toString()
                .padStart(2, "0");

        const secs =
            (
                state.focusSeconds % 60
            )
                .toString()
                .padStart(2, "0");

        return `
            <div class="km-card km-focus">

                <h3>
                    Modo foco
                </h3>

                <div class="km-muted">
                    Cronômetro local para
                    organizar sua sessão de estudo.
                </div>

                <div class="km-focus-time">
                    ${mins}:${secs}
                </div>

                <div
                    class="km-buttons"
                    style="justify-content:center">

                    <button
                        class="km-btn"
                        data-action="focus-toggle">

                        ${
                            state.focusTimer
                                ? "Pausar"
                                : "Iniciar"
                        }

                    </button>

                    <button
                        class="km-btn secondary"
                        data-action="focus-reset">
                        Zerar
                    </button>

                </div>

            </div>
        `;
    }

    function toggleSetting(
        key,
        label,
        description
    ) {
        const value =
            !!state.settings[key];

        return `
            <div class="km-setting">

                <div class="km-row">

                    <div>

                        <strong>
                            ${escapeHTML(label)}
                        </strong>

                        <div class="km-muted">
                            ${escapeHTML(
                                description
                            )}
                        </div>

                    </div>

                    <button
                        class="km-toggle ${
                            value ? "km-on" : ""
                        }"
                        data-toggle-setting="${key}"
                        aria-label="${escapeHTML(
                            label
                        )}">
                    </button>

                </div>

            </div>
        `;
    }

    function settingsHTML() {
        return `
            <div class="km-card">

                <h3>
                    Configurações
                </h3>

                <div class="km-setting">

                    <div class="km-row">

                        <div>

                            <strong>
                                Tema
                            </strong>

                            <div class="km-muted">
                                Escolha a aparência
                                do menu.
                            </div>

                        </div>

                        <select
                            class="km-select"
                            id="km-theme">

                            <option
                                value="system"
                                ${
                                    state.settings.theme ===
                                    "system"
                                        ? "selected"
                                        : ""
                                }>
                                Sistema
                            </option>

                            <option
                                value="light"
                                ${
                                    state.settings.theme ===
                                    "light"
                                        ? "selected"
                                        : ""
                                }>
                                Claro
                            </option>

                            <option
                                value="dark"
                                ${
                                    state.settings.theme ===
                                    "dark"
                                        ? "selected"
                                        : ""
                                }>
                                Escuro
                            </option>

                        </select>

                    </div>

                </div>

                ${toggleSetting(
                    "compact",
                    "Modo compacto",
                    "Reduz o tamanho do painel."
                )}

                ${toggleSetting(
                    "notifications",
                    "Notificações",
                    "Mostra mensagens do KhanMESSIAS."
                )}

                ${toggleSetting(
                    "recommendations",
                    "Recomendações",
                    "Permite detectar links de estudo na página."
                )}

                ${toggleSetting(
                    "autoRefresh",
                    "Atualização automática",
                    "Atualiza a interface quando a página muda."
                )}

            </div>

            <div class="km-card">

                <h3>
                    Dados locais
                </h3>

                <div class="km-muted">
                    Configurações e fila ficam salvas
                    no armazenamento local deste navegador.
                </div>

                <div
                    class="km-buttons"
                    style="margin-top:12px">

                    <button
                        class="km-btn danger"
                        data-action="reset">
                        Restaurar configurações
                    </button>

                </div>

            </div>
        `;
    }

    function accessibilityHTML() {
        return `
            <div class="km-card">

                <h3>
                    Acessibilidade
                </h3>

                ${toggleSetting(
                    "largeText",
                    "Texto maior",
                    "Aumenta o tamanho do texto do menu."
                )}

                ${toggleSetting(
                    "reduceMotion",
                    "Reduzir movimento",
                    "Diminui transições e animações."
                )}

            </div>
        `;
    }

    function diagnosticsHTML() {
        const links =
            Adapter.getStudyLinks();

        return `
            <div class="km-card">

                <h3>
                    Diagnóstico
                </h3>

                <div class="km-diagnostic">
${escapeHTML(
    JSON.stringify(
        {
            version: VERSION,
            url: location.href,
            title: document.title,
            language: navigator.language,
            mobile:
                /Android|iPhone|iPad|Mobile/i
                    .test(
                        navigator.userAgent
                    ),
            viewport:
                `${innerWidth}x${innerHeight}`,
            navigationFound:
                !!Adapter.getNavigation(),
            mainFound:
                !!Adapter.getMain(),
            studyLinks:
                links.length,
            queueItems:
                state.queue.length,
            observer:
                !!state.observer,
            instance: true
        },
        null,
        2
    )
)}
                </div>

            </div>
        `;
    }

    function renderCurrentPage() {
        const content =
            document.getElementById(
                "km-content"
            );

        const app =
            document.getElementById(
                "km-app"
            );

        if (!content || !app) {
            return;
        }

        const titles = {
            dashboard: "Painel",
            recommendations: "Recomendações",
            queue: "Fila de estudos",
            focus: "Modo foco",
            accessibility: "Acessibilidade",
            settings: "Configurações",
            diagnostics: "Diagnóstico"
        };

        setPageTitle(
            titles[state.page] ||
            "Painel"
        );

        app.querySelectorAll(
            ".km-nav"
        ).forEach(button => {
            button.classList.toggle(
                "km-active",
                button.dataset.page ===
                    state.page
            );
        });

        if (
            state.page ===
            "dashboard"
        ) {
            content.innerHTML =
                dashboardHTML();
        }

        if (
            state.page ===
            "recommendations"
        ) {
            content.innerHTML =
                recommendationsHTML();
        }

        if (
            state.page ===
            "queue"
        ) {
            content.innerHTML =
                queueHTML();
        }

        if (
            state.page ===
            "focus"
        ) {
            content.innerHTML =
                focusHTML();
        }

        if (
            state.page ===
            "accessibility"
        ) {
            content.innerHTML =
                accessibilityHTML();
        }

        if (
            state.page ===
            "settings"
        ) {
            content.innerHTML =
                settingsHTML();
        }

        if (
            state.page ===
            "diagnostics"
        ) {
            content.innerHTML =
                diagnosticsHTML();
        }

        bindContentEvents();

        Theme.apply();
    }

    function bindContentEvents() {
        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        const action =
                            el.dataset.action;

                        if (
                            action ===
                            "recommendations"
                        ) {
                            state.page =
                                "recommendations";

                            renderCurrentPage();
                        }

                        if (
                            action ===
                            "next"
                        ) {
                            Queue.next();
                        }

                        if (
                            action ===
                            "focus"
                        ) {
                            state.page =
                                "focus";

                            renderCurrentPage();
                        }

                        if (
                            action ===
                            "clear-queue"
                        ) {
                            Queue.clear();
                        }

                        if (
                            action ===
                            "focus-toggle"
                        ) {
                            toggleFocus();
                        }

                        if (
                            action ===
                            "focus-reset"
                        ) {
                            stopFocus();

                            state.focusSeconds =
                                0;

                            renderCurrentPage();
                        }

                        if (
                            action ===
                            "reset"
                        ) {
                            if (
                                confirm(
                                    "Restaurar as configurações do KhanMESSIAS?"
                                )
                            ) {
                                localStorage.removeItem(
                                    STORAGE_KEY
                                );

                                localStorage.removeItem(
                                    QUEUE_KEY
                                );

                                location.reload();
                            }
                        }
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-open-url]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        try {
                            location.href =
                                decodeURIComponent(
                                    el.dataset.openUrl
                                );
                        } catch (_) {}
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-add-url]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        Queue.add({
                            url:
                                decodeURIComponent(
                                    el.dataset.addUrl
                                ),

                            title:
                                decodeURIComponent(
                                    el.dataset.addTitle
                                )
                        });
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-open-queue]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                el.dataset.openQueue
                            );

                        const item =
                            state.queue[index];

                        if (!item) {
                            return;
                        }

                        location.href =
                            item.url;
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-remove-queue]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        Queue.remove(
                            Number(
                                el.dataset.removeQueue
                            )
                        );
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-toggle-setting]"
            )
            .forEach(el => {

                el.addEventListener(
                    "click",
                    () => {

                        const key =
                            el.dataset.toggleSetting;

                        state.settings[key] =
                            !state.settings[key];

                        saveSettings();

                        Theme.apply();

                        renderCurrentPage();
                    }
                );
            });

        const theme =
            document.getElementById(
                "km-theme"
            );

        if (theme) {
            theme.addEventListener(
                "change",
                () => {

                    state.settings.theme =
                        theme.value;

                    saveSettings();

                    Theme.apply();
                }
            );
        }
    }

    function toggleFocus() {
        if (state.focusTimer) {
            stopFocus();
            renderCurrentPage();
            return;
        }

        state.focusTimer = true;

        state.focusTimerId =
            setInterval(() => {

                if (!state.focusTimer) {
                    return;
                }

                state.focusSeconds++;

                if (
                    state.page === "focus" &&
                    state.open
                ) {
                    renderCurrentPage();
                }

            }, 1000);

        renderCurrentPage();

        toast("Modo foco iniciado.");
    }

    function stopFocus() {
        state.focusTimer = false;

        if (state.focusTimerId) {
            clearInterval(
                state.focusTimerId
            );

            state.focusTimerId = null;
        }
    }

    function installKeyboard() {
        if (state.keyboardHandler) {
            document.removeEventListener(
                "keydown",
                state.keyboardHandler,
                true
            );
        }

        state.keyboardHandler =
            event => {

                const tag =
                    event.target?.tagName;

                const editing =
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT" ||
                    event.target?.isContentEditable;

                if (editing) {
                    return;
                }

                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key.toLowerCase() ===
                        "k"
                ) {
                    event.preventDefault();

                    toggle();
                }

                if (
                    event.key === "Escape" &&
                    state.open
                ) {
                    close();
                }
            };

        document.addEventListener(
            "keydown",
            state.keyboardHandler,
            true
        );
    }

    function installObserver() {
        if (!state.settings.autoRefresh) {
            return;
        }

        state.observer?.disconnect();

        let scheduled = false;

        state.observer =
            new MutationObserver(() => {

                if (
                    !state.open ||
                    scheduled
                ) {
                    return;
                }

                scheduled = true;

                setTimeout(() => {

                    scheduled = false;

                    if (
                        state.page ===
                            "recommendations" ||
                        state.page ===
                            "dashboard"
                    ) {
                        renderCurrentPage();
                    }

                }, 700);
            });

        state.observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    function installRouteWatcher() {
        clearInterval(
            state.routeTimer
        );

        state.routeTimer =
            setInterval(() => {

                if (
                    location.href ===
                    state.lastUrl
                ) {
                    return;
                }

                state.lastUrl =
                    location.href;

                if (state.open) {
                    setTimeout(
                        renderCurrentPage,
                        500
                    );
                }

            }, 500);
    }

    function installSystemThemeWatcher() {
        const media =
            matchMedia(
                "(prefers-color-scheme: dark)"
            );

        state.themeHandler =
            () => {

                if (
                    state.settings.theme ===
                    "system"
                ) {
                    Theme.apply();
                }
            };

        media.addEventListener?.(
            "change",
            state.themeHandler
        );
    }

    function destroy() {
        state.destroyed = true;

        state.observer?.disconnect();

        clearInterval(
            state.routeTimer
        );

        stopFocus();

        if (state.keyboardHandler) {
            document.removeEventListener(
                "keydown",
                state.keyboardHandler,
                true
            );
        }

        document
            .getElementById("km-app")
            ?.remove();

        document
            .getElementById("km-launcher")
            ?.remove();

        document
            .getElementById("km-style")
            ?.remove();

        window[INSTANCE_KEY] = null;
    }

    function setup() {
        try {
            loadSettings();

            injectStyles();

            buildUI();

            installKeyboard();

            installObserver();

            installRouteWatcher();

            installSystemThemeWatcher();

            window[INSTANCE_KEY] = {
                destroy
            };

            window.KhanMESSIAS = {
                version: VERSION,

                features,

                settings:
                    state.settings,

                Adapter,

                Queue,

                open,

                close,

                toggle,

                refresh:
                    renderCurrentPage,

                destroy
            };

            window.__KhanMESSIAS_LOADED__ =
                true;

            setTimeout(() => {
                toast(
                    `KhanMESSIAS ${VERSION} carregado.`
                );
            }, 250);

            log(
                "Inicializado com sucesso."
            );

        } catch (e) {

            error(
                "Falha durante a inicialização.",
                e
            );

            window.__KhanMESSIAS_LOADED__ =
                false;

            toast(
                "KhanMESSIAS encontrou um erro ao iniciar."
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            setup,
            { once: true }
        );
    } else {
        setup();
    }

})();
