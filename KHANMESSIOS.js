(() => {
    "use strict";

    /*
     * ============================================================
     * 🍷 KHANMESSIAS
     * ============================================================
     * Menu flutuante simples
     *
     * Funções:
     *  - Analisar a página 100%
     *  - Obter questão/enunciado visível
     *
     * A análise não fornece respostas automáticas.
     * ============================================================
     */

    const VERSION = "5.0.0";

    // Evita carregar duas cópias ao mesmo tempo.
    if (window.__KHANMESSIAS_RUNNING__) {
        console.warn("KhanMESSIAS já está executando.");
        return;
    }

    window.__KHANMESSIAS_RUNNING__ = true;

    const state = {
        analyzing: false,
        analysisComplete: false
    };

    /*
     * ============================================================
     * ESTILOS
     * ============================================================
     */

    const style = document.createElement("style");

    style.id = "khanmessias-style";

    style.textContent = `
        #khanmessias-root,
        #khanmessias-root * {
            box-sizing: border-box;
        }

        #khanmessias-root {
            position: fixed;

            right: 18px;
            bottom: 18px;

            z-index: 2147483647;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            color: #ffffff;
        }

        #khanmessias-launcher {
            width: 58px;
            height: 58px;

            border: none;
            border-radius: 50%;

            background: #171717;

            box-shadow:
                0 8px 30px rgba(0, 0, 0, .35);

            cursor: pointer;

            font-size: 29px;

            display: flex;
            align-items: center;
            justify-content: center;

            transition:
                transform .18s ease,
                box-shadow .18s ease;
        }

        #khanmessias-launcher:hover {
            transform: scale(1.08);

            box-shadow:
                0 10px 35px rgba(0, 0, 0, .45);
        }

        #khanmessias-panel {
            position: absolute;

            right: 0;
            bottom: 70px;

            width: 310px;

            padding: 15px;

            border-radius: 16px;

            background: #181818;

            border:
                1px solid rgba(255,255,255,.10);

            box-shadow:
                0 15px 50px rgba(0,0,0,.45);

            display: none;
        }

        #khanmessias-panel.km-open {
            display: block;
            animation:
                khanmessias-open .16s ease;
        }

        @keyframes khanmessias-open {
            from {
                opacity: 0;
                transform:
                    translateY(8px)
                    scale(.97);
            }

            to {
                opacity: 1;
                transform:
                    translateY(0)
                    scale(1);
            }
        }

        .km-header {
            display: flex;

            align-items: center;
            justify-content: space-between;

            margin-bottom: 15px;
        }

        .km-title {
            font-size: 17px;

            font-weight: 800;
        }

        .km-version {
            margin-top: 3px;

            color: #8d8d8d;

            font-size: 11px;
        }

        .km-close {
            width: 30px;
            height: 30px;

            border: none;
            border-radius: 8px;

            background: #292929;

            color: #ffffff;

            cursor: pointer;

            font-size: 17px;
        }

        .km-option {
            width: 100%;

            margin-bottom: 10px;

            padding: 12px;

            border-radius: 12px;

            background: #222222;

            border:
                1px solid rgba(255,255,255,.07);
        }

        .km-option-row {
            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 10px;
        }

        .km-option-title {
            font-size: 13px;

            font-weight: 700;
        }

        .km-option-description {
            margin-top: 4px;

            color: #858585;

            font-size: 11px;

            line-height: 1.4;
        }

        .km-switch {
            flex-shrink: 0;

            width: 45px;
            height: 25px;

            border: none;

            border-radius: 20px;

            background: #555555;

            cursor: pointer;

            position: relative;

            transition:
                background .18s ease;
        }

        .km-switch::after {
            content: "";

            position: absolute;

            top: 3px;
            left: 3px;

            width: 19px;
            height: 19px;

            border-radius: 50%;

            background: #ffffff;

            transition:
                transform .18s ease;
        }

        .km-switch.km-on {
            background: #16a05d;
        }

        .km-switch.km-on::after {
            transform:
                translateX(20px);
        }

        .km-question-button {
            width: 100%;

            padding: 12px;

            border: none;

            border-radius: 11px;

            background: #16a05d;

            color: #ffffff;

            cursor: pointer;

            font-size: 13px;

            font-weight: 800;

            transition:
                background .15s ease,
                transform .15s ease;
        }

        .km-question-button:hover {
            background: #12884e;
        }

        .km-question-button:active {
            transform: scale(.98);
        }

        .km-question-button:disabled {
            opacity: .5;

            cursor: not-allowed;
        }

        .km-status {
            margin-top: 10px;

            padding: 9px;

            border-radius: 9px;

            background: #222222;

            color: #999999;

            font-size: 11px;

            line-height: 1.4;
        }

        .km-notification-container {
            position: fixed;

            right: 18px;
            bottom: 88px;

            z-index: 2147483647;

            width:
                min(340px, calc(100vw - 36px));

            pointer-events: none;
        }

        .km-notification {
            margin-top: 8px;

            padding: 13px 15px;

            border-radius: 12px;

            background: #181818;

            border:
                1px solid rgba(255,255,255,.10);

            box-shadow:
                0 10px 35px rgba(0,0,0,.35);

            color: #ffffff;

            font-size: 13px;

            line-height: 1.45;

            opacity: 0;

            transform:
                translateY(8px);

            transition:
                opacity .18s ease,
                transform .18s ease;
        }

        .km-notification.km-show {
            opacity: 1;

            transform:
                translateY(0);
        }

        .km-notification-title {
            margin-bottom: 4px;

            font-weight: 800;
        }

        .km-notification-content {
            color: #cccccc;

            word-break: break-word;
        }

        @media (max-width: 500px) {
            #khanmessias-root {
                right: 12px;
                bottom: 12px;
            }

            #khanmessias-panel {
                width:
                    min(
                        310px,
                        calc(100vw - 24px)
                    );
            }

            .km-notification-container {
                right: 12px;
                bottom: 82px;

                width:
                    calc(100vw - 24px);
            }
        }
    `;

    document.head.appendChild(style);

    /*
     * ============================================================
     * UTILIDADES
     * ============================================================
     */

    function notify(title, message, duration = 3500) {
        let container =
            document.getElementById(
                "khanmessias-notifications"
            );

        if (!container) {
            container =
                document.createElement("div");

            container.id =
                "khanmessias-notifications";

            container.className =
                "km-notification-container";

            document.body.appendChild(container);
        }

        const notification =
            document.createElement("div");

        notification.className =
            "km-notification";

        notification.innerHTML = `
            <div class="km-notification-title">
                ${escapeHTML(title)}
            </div>

            <div class="km-notification-content">
                ${escapeHTML(message)}
            </div>
        `;

        container.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add(
                "km-show"
            );
        });

        setTimeout(() => {
            notification.classList.remove(
                "km-show"
            );

            setTimeout(() => {
                notification.remove();
            }, 200);
        }, duration);
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /*
     * ============================================================
     * CRIAÇÃO DO MENU
     * ============================================================
     */

    const root =
        document.createElement("div");

    root.id =
        "khanmessias-root";

    root.innerHTML = `
        <div id="khanmessias-panel">

            <div class="km-header">

                <div>
                    <div class="km-title">
                        🍷 KhanMESSIAS
                    </div>

                    <div class="km-version">
                        V${VERSION}
                    </div>
                </div>

                <button
                    class="km-close"
                    id="km-close">
                    ×
                </button>

            </div>

            <div class="km-option">

                <div class="km-option-row">

                    <div>

                        <div class="km-option-title">
                            Analisar a página 100%
                        </div>

                        <div class="km-option-description">
                            Analisa o conteúdo atualmente
                            carregado na página.
                        </div>

                    </div>

                    <button
                        id="km-analysis-switch"
                        class="km-switch"
                        aria-label="Analisar página">
                    </button>

                </div>

            </div>

            <div
                id="km-question-area"
                style="display:none">

                <div class="km-option">

                    <div class="km-option-title">
                        Obter questões
                    </div>

                    <div class="km-option-description">
                        Identifica o enunciado da
                        questão atualmente visível.
                    </div>

                    <button
                        id="km-question-button"
                        class="km-question-button"
                        style="margin-top:10px">
                        Obter questões
                    </button>

                </div>

            </div>

            <div
                id="km-status"
                class="km-status">
                Análise desativada.
            </div>

        </div>

        <button
            id="khanmessias-launcher"
            title="Abrir KhanMESSIAS"
            aria-label="Abrir KhanMESSIAS">
            🍷
        </button>
    `;

    document.body.appendChild(root);

    /*
     * ============================================================
     * ELEMENTOS
     * ============================================================
     */

    const panel =
        document.getElementById(
            "khanmessias-panel"
        );

    const launcher =
        document.getElementById(
            "khanmessias-launcher"
        );

    const closeButton =
        document.getElementById(
            "km-close"
        );

    const analysisSwitch =
        document.getElementById(
            "km-analysis-switch"
        );

    const questionArea =
        document.getElementById(
            "km-question-area"
        );

    const questionButton =
        document.getElementById(
            "km-question-button"
        );

    const status =
        document.getElementById(
            "km-status"
        );

    /*
     * ============================================================
     * MENU
     * ============================================================
     */

    launcher.addEventListener(
        "click",
        () => {
            panel.classList.toggle(
                "km-open"
            );
        }
    );

    closeButton.addEventListener(
        "click",
        () => {
            panel.classList.remove(
                "km-open"
            );
        }
    );

    /*
     * ============================================================
     * ANÁLISE DA PÁGINA
     * ============================================================
     */

    analysisSwitch.addEventListener(
        "click",
        async () => {

            if (state.analyzing) {
                return;
            }

            state.analyzing =
                !state.analyzing;

            analysisSwitch.classList.toggle(
                "km-on",
                state.analyzing
            );

            if (!state.analyzing) {

                state.analysisComplete =
                    false;

                questionArea.style.display =
                    "none";

                status.textContent =
                    "Análise desativada.";

                notify(
                    "KhanMESSIAS",
                    "Análise da página desativada."
                );

                return;
            }

            status.textContent =
                "Analisando a página...";

            notify(
                "Analisando",
                "Analisando o conteúdo atualmente carregado..."
            );

            await analyzePage();

        }
    );

    async function analyzePage() {

        /*
         * Pequenas pausas para permitir que
         * páginas dinâmicas terminem de renderizar.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );

        const bodyText =
            document.body?.innerText || "";

        const links =
            [...document.querySelectorAll(
                "a[href]"
            )];

        const buttons =
            [...document.querySelectorAll(
                "button"
            )];

        const inputs =
            [...document.querySelectorAll(
                "input, textarea"
            )];

        const headings =
            [...document.querySelectorAll(
                "h1,h2,h3,h4,h5,h6"
            )];

        state.analysisComplete =
            true;

        questionArea.style.display =
            "block";

        status.textContent =
            "Página analisada.";

        notify(
            "Análise concluída",
            `${bodyText.length} caracteres, ${links.length} links, ${buttons.length} botões e ${inputs.length} campos detectados.`
        );

        console.log(
            "[KhanMESSIAS] Análise:",
            {
                caracteres:
                    bodyText.length,

                links:
                    links.length,

                buttons:
                    buttons.length,

                inputs:
                    inputs.length,

                headings:
                    headings.length
            }
        );
    }

    /*
     * ============================================================
     * DETECÇÃO DE QUESTÃO
     * ============================================================
     */

    questionButton.addEventListener(
        "click",
        () => {

            if (
                !state.analysisComplete
            ) {
                notify(
                    "KhanMESSIAS",
                    "Ative primeiro a análise da página."
                );

                return;
            }

            const question =
                findQuestionText();

            if (!question) {

                notify(
                    "Questão",
                    "Não consegui identificar um enunciado de questão na página atual."
                );

                return;
            }

            /*
             * Mostramos o enunciado detectado.
             * Não procuramos nem fornecemos a resposta.
             */

            notify(
                "Questão detectada",
                question,
                7000
            );

            console.log(
                "[KhanMESSIAS] Questão detectada:",
                question
            );
        }
    );

    function findQuestionText() {

        const selectors = [
            '[data-testid*="question"]',
            '[data-testid*="Question"]',
            '[class*="question"]',
            '[class*="Question"]',
            '[aria-label*="question" i]',
            '[aria-label*="questão" i]',
            "main"
        ];

        const candidates = [];

        for (
            const selector of selectors
        ) {

            try {

                document
                    .querySelectorAll(
                        selector
                    )
                    .forEach(element => {

                        const text =
                            (
                                element.innerText ||
                                element.textContent ||
                                ""
                            )
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim();

                        if (
                            text.length >= 15 &&
                            text.length <= 1500
                        ) {
                            candidates.push(text);
                        }

                    });

            } catch (_) {}
        }

        /*
         * Remove duplicatas.
         */

        const unique =
            [...new Set(candidates)];

        /*
         * Preferimos textos que tenham
         * características comuns de enunciado.
         */

        const questionLike =
            unique.filter(text => {

                const lower =
                    text.toLowerCase();

                return (
                    lower.includes("?") ||
                    lower.includes("qual") ||
                    lower.includes("quanto") ||
                    lower.includes("determine") ||
                    lower.includes("calcule") ||
                    lower.includes("resolva") ||
                    lower.includes("what") ||
                    lower.includes("which") ||
                    lower.includes("calculate") ||
                    lower.includes("solve")
                );

            });

        if (questionLike.length) {
            return questionLike
                .sort(
                    (a, b) =>
                        a.length - b.length
                )[0];
        }

        /*
         * Caso não tenha encontrado um texto
         * claramente interrogativo, usa o
         * primeiro candidato razoável.
         */

        return unique
            .sort(
                (a, b) =>
                    a.length - b.length
            )[0] || null;
    }

    /*
     * ============================================================
     * TECLADO
     * ============================================================
     */

    document.addEventListener(
        "keydown",
        event => {

            /*
             * Ctrl + Shift + K
             * abre/fecha o menu.
             */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() ===
                    "k"
            ) {

                event.preventDefault();

                panel.classList.toggle(
                    "km-open"
                );
            }

            /*
             * ESC fecha o menu.
             */

            if (
                event.key === "Escape"
            ) {

                panel.classList.remove(
                    "km-open"
                );
            }

        },
        true
    );

    /*
     * ============================================================
     * API GLOBAL
     * ============================================================
     */

    window.KhanMESSIAS = {

        version: VERSION,

        open() {
            panel.classList.add(
                "km-open"
            );
        },

        close() {
            panel.classList.remove(
                "km-open"
            );
        },

        toggle() {
            panel.classList.toggle(
                "km-open"
            );
        },

        analyze() {
            if (
                !state.analyzing
            ) {
                analysisSwitch.click();
            }
        },

        getQuestion() {
            return findQuestionText();
        },

        state
    };

    /*
     * ============================================================
     * INICIALIZAÇÃO
     * ============================================================
     */

    console.log(
        `%c🍷 KhanMESSIAS V${VERSION} carregado.`,
        "font-weight:bold;font-size:14px"
    );

    notify(
        "🍷 KhanMESSIAS",
        "Menu carregado. Clique no 🍷 para abrir.",
        3000
    );

})();
