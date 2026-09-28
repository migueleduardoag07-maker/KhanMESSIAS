(() => {
    "use strict";

    /*
     * ============================================================
     * KHANWARE V4
     * ============================================================
     *
     * Núcleo reconstruído a partir da arquitetura da V3.
     *
     * Mantidos conceitos da versão original:
     * - ver
     * - isDev
     * - device
     * - user
     * - loadedPlugins
     * - features
     * - featureConfigs
     * - translations
     * - delay()
     * - playAudio()
     * - sendToast()
     * - setupMenu()
     * - setupMain()
     * - boot()
     *
     * Principais mudanças:
     * - sem eval()
     * - sem execução arbitrária de JavaScript remoto
     * - sem dependência obrigatória de GraphQL interno
     * - MutationObserver no lugar de dependência externa de DOM
     * - armazenamento local de configurações
     * - sistema de módulos
     * - tratamento de erros
     * - menu responsivo
     * - tema claro/escuro
     * - descoberta de recomendações pela interface
     * - Study Queue
     * - diagnóstico
     *
     * ============================================================
     */

    /* ============================================================
     * CONFIGURAÇÃO
     * ============================================================ */

    const ver = "V4.0.0";
    const isDev = false;

    const APP_NAME = "Khanware";
    const STORAGE_KEY = "khanware:v4:settings";

    const CONFIG = {
        debug: isDev,
        observeDOM: true,
        menuRetryInterval: 1000,
        menuMaxRetries: 30,
        toastDuration: 4000,
        maxStudyItems: 20
    };

    /* ============================================================
     * DEVICE
     * ============================================================ */

    const device = {
        mobile:
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|Mobile|Tablet|Kindle|Silk|PlayBook|BB10/i
                .test(navigator.userAgent),

        apple:
            /iPhone|iPad|iPod|Macintosh|Mac OS X/i
                .test(navigator.userAgent),

        language:
            (navigator.language || "en").split("-")[0]
    };

    /* ============================================================
     * USER
     * ============================================================ */

    let user = {
        username: "Username",
        nickname: "Nickname",
        UID: null
    };

    /* ============================================================
     * PLUGINS
     * ============================================================ */

    const loadedPlugins = [];

    /* ============================================================
     * FEATURES
     *
     * Mantemos nomes próximos da V3 para não quebrar código
     * que eventualmente dependa dessas flags.
     * ============================================================ */

    window.features = {
        questionSpoof: false,
        videoSpoof: false,
        autoAnswer: false,

        customBanner: false,
        nextRecomendation: true,
        repeatQuestion: false,
        minuteFarmer: false,
        rgbLogo: false,

        studyQueue: true,
        recommendations: true,
        accessibility: true,
        dashboard: true
    };

    window.featureConfigs = {
        autoAnswerDelay: 3,
        customUsername: "",
        customPfp: "",
        openRouterKey: "",

        theme: "system",
        compactMode: false,
        notifications: true
    };

    /* ============================================================
     * TRANSLATIONS
     * ============================================================ */

    let translations = {};

    const fallbackTranslations = {
        en: {
            injection_success: "Khanware loaded successfully.",
            welcome_back: "Welcome back",
            recommendations: "Recommendations",
            dashboard: "Dashboard",
            studyQueue: "Study Queue",
            settings: "Settings",
            diagnostics: "Diagnostics",
            accessibility: "Accessibility",
            continue: "Continue",
            start: "Start",
            noRecommendations: "No recommendations found.",
            saved: "Settings saved.",
            enabled: "Enabled",
            disabled: "Disabled"
        },

        pt: {
            injection_success: "Khanware carregado com sucesso.",
            welcome_back: "Bem-vindo de volta",
            recommendations: "Recomendações",
            dashboard: "Painel",
            studyQueue: "Fila de estudos",
            settings: "Configurações",
            diagnostics: "Diagnóstico",
            accessibility: "Acessibilidade",
            continue: "Continuar",
            start: "Começar",
            noRecommendations: "Nenhuma recomendação encontrada.",
            saved: "Configurações salvas.",
            enabled: "Ativado",
            disabled: "Desativado"
        }
    };

    function t(key) {
        return (
            translations?.[device.language]?.[key] ??
            fallbackTranslations?.[device.language]?.[key] ??
            translations?.en?.[key] ??
            fallbackTranslations.en[key] ??
            key
        );
    }

    /* ============================================================
     * LOGGER
     * ============================================================ */

    const Logger = {
        prefix: `[${APP_NAME} ${ver}]`,

        log(...args) {
            if (CONFIG.debug) {
                console.log(this.prefix, ...args);
            }
        },

        info(...args) {
            console.info(this.prefix, ...args);
        },

        warn(...args) {
            console.warn(this.prefix, ...args);
        },

        error(...args) {
            console.error(this.prefix, ...args);
        }
    };

    window.debug = function (text) {
        Logger.log(text);
    };

    /* ============================================================
     * UTILS
     * ============================================================ */

    const delay = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    async function safeDelay(ms) {
        await delay(Math.max(0, Number(ms) || 0));
    }

    async function playAudio(url) {
        try {
            const audio = new Audio(url);
            await audio.play();
            Logger.log(`Playing audio from ${url}`);
        } catch (error) {
            Logger.warn("Audio could not be played.", error);
        }
    }

    function findAndClickBySelector(selector) {
        const element = document.querySelector(selector);

        if (!element) {
            return false;
        }

        try {
            element.click();
            Logger.log(`Pressed ${selector}`);
            return true;
        } catch (error) {
            Logger.warn(`Could not click ${selector}`, error);
            return false;
        }
    }

    /* ============================================================
     * TOAST SYSTEM
     * ============================================================ */

    let toastContainer = null;

    function ensureToastContainer() {
        if (toastContainer?.isConnected) {
            return toastContainer;
        }

        toastContainer = document.createElement("div");
        toastContainer.id = "kw-toast-container";

        document.body.appendChild(toastContainer);

        return toastContainer;
    }

    function sendToast(
        text,
        duration = CONFIG.toastDuration,
        gravity = "bottom"
    ) {
        if (!featureConfigs.notifications) {
            return;
        }

        const container = ensureToastContainer();

        const toast = document.createElement("div");

        toast.className = "kw-toast";
        toast.dataset.gravity = gravity;

        toast.textContent = text;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("kw-toast-visible");
        });

        setTimeout(() => {
            toast.classList.remove("kw-toast-visible");

            setTimeout(() => {
                toast.remove();
            }, 250);
        }, duration);

        Logger.log(text);
    }

    /* ============================================================
     * STORAGE
     * ============================================================ */

    const Storage = {
        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);

                if (!raw) {
                    return null;
                }

                return JSON.parse(raw);
            } catch (error) {
                Logger.error("Could not load settings.", error);
                return null;
            }
        },

        save(data) {
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(data)
                );

                return true;
            } catch (error) {
                Logger.error("Could not save settings.", error);
                return false;
            }
        },

        get(key, fallback = null) {
            const data = this.load();

            return data && key in data
                ? data[key]
                : fallback;
        },

        set(key, value) {
            const data = this.load() || {};

            data[key] = value;

            return this.save(data);
        }
    };

    /* ============================================================
     * SETTINGS
     * ============================================================ */

    const Settings = {
        load() {
            const saved = Storage.load();

            if (!saved) {
                return;
            }

            if (saved.features) {
                Object.assign(
                    window.features,
                    saved.features
                );
            }

            if (saved.featureConfigs) {
                Object.assign(
                    window.featureConfigs,
                    saved.featureConfigs
                );
            }
        },

        save() {
            return Storage.save({
                features: window.features,
                featureConfigs: window.featureConfigs
            });
        },

        reset() {
            localStorage.removeItem(STORAGE_KEY);

            location.reload();
        }
    };

    /* ============================================================
     * STYLE
     * ============================================================ */

    function injectStyles() {
        if (document.getElementById("kw-v4-style")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "kw-v4-style";

        style.textContent = `
            #kw-app,
            #kw-app * {
                box-sizing: border-box;
            }

            #kw-app {
                --kw-bg: #ffffff;
                --kw-bg-secondary: #f5f7fa;
                --kw-text: #202124;
                --kw-text-secondary: #687078;
                --kw-border: #e1e5e9;
                --kw-accent: #14a05a;
                --kw-accent-hover: #10894d;
                --kw-danger: #d93025;
                --kw-shadow:
                    0 12px 35px rgba(0,0,0,.15);

                position: fixed;
                top: 80px;
                right: 24px;

                width: min(720px, calc(100vw - 32px));
                height: min(650px, calc(100vh - 110px));

                z-index: 999999;

                display: none;

                overflow: hidden;

                border: 1px solid var(--kw-border);
                border-radius: 18px;

                background: var(--kw-bg);
                color: var(--kw-text);

                box-shadow: var(--kw-shadow);

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            #kw-app.kw-open {
                display: flex;
            }

            #kw-app.kw-dark {
                --kw-bg: #17191c;
                --kw-bg-secondary: #202327;
                --kw-text: #f1f3f4;
                --kw-text-secondary: #aeb4ba;
                --kw-border: #34383d;
                --kw-shadow:
                    0 18px 50px rgba(0,0,0,.45);
            }

            .kw-sidebar {
                width: 190px;
                flex-shrink: 0;

                padding: 14px;

                background:
                    var(--kw-bg-secondary);

                border-right:
                    1px solid var(--kw-border);

                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .kw-brand {
                padding: 14px 10px 18px;
                font-size: 17px;
                font-weight: 800;
            }

            .kw-brand span {
                color: var(--kw-accent);
            }

            .kw-nav-button {
                border: 0;
                border-radius: 10px;

                padding: 10px;

                text-align: left;

                background: transparent;
                color: var(--kw-text-secondary);

                cursor: pointer;

                font: inherit;
            }

            .kw-nav-button:hover {
                background: var(--kw-bg);
                color: var(--kw-text);
            }

            .kw-nav-button.kw-active {
                background: var(--kw-accent);
                color: white;
            }

            .kw-main {
                min-width: 0;
                flex: 1;

                display: flex;
                flex-direction: column;
            }

            .kw-header {
                height: 62px;

                display: flex;
                align-items: center;
                justify-content: space-between;

                padding: 0 18px;

                border-bottom:
                    1px solid var(--kw-border);
            }

            .kw-header-title {
                font-size: 16px;
                font-weight: 750;
            }

            .kw-header-actions {
                display: flex;
                gap: 6px;
            }

            .kw-icon-button {
                width: 34px;
                height: 34px;

                border: 0;
                border-radius: 9px;

                background: var(--kw-bg-secondary);
                color: var(--kw-text);

                cursor: pointer;
                font-size: 16px;
            }

            .kw-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .kw-card {
                border: 1px solid var(--kw-border);
                border-radius: 14px;

                padding: 16px;

                margin-bottom: 12px;

                background: var(--kw-bg);
            }

            .kw-card-title {
                font-weight: 750;
                margin-bottom: 5px;
            }

            .kw-muted {
                color: var(--kw-text-secondary);
                font-size: 13px;
            }

            .kw-button {
                border: 0;
                border-radius: 9px;

                padding: 9px 13px;

                background: var(--kw-accent);
                color: white;

                cursor: pointer;
                font-weight: 650;
            }

            .kw-button:hover {
                background: var(--kw-accent-hover);
            }

            .kw-button.secondary {
                background: var(--kw-bg-secondary);
                color: var(--kw-text);
            }

            .kw-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .kw-setting {
                padding: 13px 0;
                border-bottom: 1px solid var(--kw-border);
            }

            .kw-setting:last-child {
                border-bottom: 0;
            }

            .kw-switch {
                width: 42px;
                height: 23px;

                position: relative;

                border-radius: 999px;

                background: #9aa0a6;

                cursor: pointer;
            }

            .kw-switch::after {
                content: "";

                position: absolute;

                width: 17px;
                height: 17px;

                top: 3px;
                left: 3px;

                border-radius: 50%;

                background: white;

                transition: .18s;
            }

            .kw-switch.kw-on {
                background: var(--kw-accent);
            }

            .kw-switch.kw-on::after {
                transform: translateX(19px);
            }

            .kw-progress {
                height: 7px;

                margin-top: 12px;

                overflow: hidden;

                border-radius: 999px;

                background: var(--kw-bg-secondary);
            }

            .kw-progress > div {
                height: 100%;
                width: 0;

                background: var(--kw-accent);
            }

            .kw-toast-container {
                position: fixed;
                left: 50%;
                bottom: 22px;

                z-index: 1000000;

                transform: translateX(-50%);

                display: flex;
                flex-direction: column;
                gap: 8px;

                pointer-events: none;
            }

            .kw-toast {
                max-width: min(450px, calc(100vw - 30px));

                padding: 11px 15px;

                border-radius: 10px;

                background: #202124;
                color: white;

                font-size: 13px;

                opacity: 0;
                transform: translateY(8px);

                transition:
                    opacity .2s,
                    transform .2s;
            }

            .kw-toast-visible {
                opacity: 1;
                transform: translateY(0);
            }

            .kw-empty {
                padding: 35px 15px;
                text-align: center;
                color: var(--kw-text-secondary);
            }

            .kw-recommendation {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .kw-recommendation-actions {
                display: flex;
                gap: 7px;
            }

            .kw-diagnostic {
                font-family: monospace;
                font-size: 12px;

                padding: 10px;

                border-radius: 9px;

                background: var(--kw-bg-secondary);

                overflow-x: auto;
            }

            @media(max-width: 650px) {
                #kw-app {
                    top: 10px;
                    right: 10px;

                    width: calc(100vw - 20px);
                    height: calc(100vh - 20px);

                    border-radius: 14px;
                }

                .kw-sidebar {
                    width: 58px;
                    padding: 8px;
                }

                .kw-brand {
                    text-align: center;
                    font-size: 0;
                }

                .kw-brand::before {
                    content: "K";
                    font-size: 20px;
                }

                .kw-nav-button {
                    text-align: center;
                    font-size: 0;
                }

                .kw-nav-button::first-letter {
                    font-size: 18px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* ==================================
