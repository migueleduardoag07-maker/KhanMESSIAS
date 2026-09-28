(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo no navegador!");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // Estilos da interface
    const style = document.createElement("style");
    style.textContent = `
        #km-button {
            position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
            border-radius: 50%; border: none; background: #171717; color: white;
            font-size: 28px; z-index: 999999; cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            transition: transform 0.2s ease;
        }
        #km-button:hover { transform: scale(1.08); }
        #km-menu {
            position: fixed; right: 20px; bottom: 90px; width: 330px; background: #18181b;
            color: #f4f4f5; padding: 16px; border-radius: 16px; display: none;
            z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 12px 30px rgba(0,0,0,0.7); border: 1px solid #27272a;
        }
        .km-btn {
            width: 100%; padding: 12px; margin-top: 10px; border: none;
            border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px;
            transition: all 0.2s ease;
        }
        #km-resposta {
            margin-top: 15px; padding: 12px; background: #09090b; border-radius: 10px;
            color: #4ade80; font-size: 13px; display: none; word-wrap: break-word;
            max-height: 320px; overflow-y: auto; border: 1px solid #22c55e33;
        }
        .km-meta-info {
            font-size: 11px; color: #a1a1aa; margin-top: 8px; border-top: 1px solid #27272a; padding-top: 6px;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "km-button";
    button.textContent = "🍷";

    const menu = document.createElement("div");
    menu.id = "km-menu";
    menu.innerHTML = `
        <h3 style="margin: 0 0 12px 0; text-align: center; color: #fff; font-size: 18px;">KhanMESSIAS v7.0</h3>
        <button class="km-btn" id="analisar" style="background:#27272a; color:#fff;">Analisar página 100% OFF</button>
        <div id="extra"></div>
        <div id="km-resposta"></div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(menu);

    button.onclick = () => {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    };

    // =========================================================================
    // === DECODIFICADOR DE LATEX E TEXTO MATEMÁTICO                            ===
    // =========================================================================

    const mathDecoder = {
        cleanTeX(tex) {
            if (!tex) return "";
            return tex
                .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
                .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
                .replace(/\\text\{([^}]+)\}/g, "$1")
                .replace(/\\mathrm\{([^}]+)\}/g, "$1")
                .replace(/\\angle\s*([A-Za-z0-9]+)?/g, "∠$1")
                .replace(/\\degree/g, "°")
                .replace(/\\sin/g, "sen")
                .replace(/\\cos/g, "cos")
                .replace(/\\tan|\\tg/g, "tg")
                .replace(/\\theta/g, "θ")
                .replace(/\s+/g, " ")
                .trim();
        },

        extractDeepText(node) {
            if (!node) return "";
            if (node.id === "km-menu" || node.id === "km-button") return "";

            if (node.querySelector) {
                const hiddenTeX = node.querySelector('annotation[encoding*="tex"], [data-latex]');
                if (hiddenTeX) {
                    const tex = hiddenTeX.textContent || hiddenTeX.getAttribute('data-latex');
                    if (tex && tex.trim()) return this.cleanTeX(tex);
                }
            }

            if (node.getAttribute) {
                const ariaLabel = node.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.trim()) return this.cleanTeX(ariaLabel);
            }

            if (node.nodeType === Node.TEXT_NODE) return node.textContent;

            const tagName = node.tagName ? node.tagName.toLowerCase() : "";
            if (['script', 'style', 'noscript', 'template'].includes(tagName)) return "";

            let text = "";
            for (let child of node.childNodes) {
                text += this.extractDeepText(child) + " ";
            }

            return this.cleanTeX(text);
        }
    };

    // =========================================================================
    // === VARREDURA DE ALTERNATIVAS                                            ===
    // =========================================================================

    function detectAllAlternatives() {
        const ignoreElements = (el) => {
            if (!el) return true;
            if (menu.contains(el) || button.contains(el)) return true;
            const txt = (el.innerText || "").toLowerCase();
            return txt.includes('verificar') || txt.includes('pular');
        };

        const seletoresKhan = [
            '[data-testid*="radio-option"]',
            '[data-testid*="choice"]',
            '[data-testid*="option"]',
            '.perseus-radio-option',
            '[role="radio"]',
            '[role="checkbox"]'
        ];

        let rawElements = Array.from(document.querySelectorAll(seletoresKhan.join(', ')))
            .filter(el => !ignoreElements(el));

        if (rawElements.length < 2) {
            const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
                .filter(el => !ignoreElements(el));
            
            inputs.forEach(input => {
                const container = input.closest('label') || input.closest('li') || input.parentElement;
                if (container && !rawElements.includes(container)) {
                    rawElements.push(container);
                }
            });
        }

        const alternativas = [];
        const textosVistos = new Set();
        const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        rawElements.forEach((el) => {
            const textoExtraido = mathDecoder.extractDeepText(el).trim();

            if (textoExtraido && textoExtraido.length > 0 && textoExtraido.length < 600) {
                const chaveTexto = textoExtraido.replace(/\s+/g, '').toLowerCase();
                if (!textosVistos.has(chaveTexto)) {
                    textosVistos.add(chaveTexto);
                    const idx = alternativas.length;
                    alternativas.push({
                        letra: letras[idx] || `${idx + 1}`,
                        textoOriginal: textoExtraido,
                        elemento: el,
                        indice: idx
                    });
                }
            }
        });

        return alternativas;
    }

    function extractQuestionText(alternativas) {
        const cloneBody = document.body.cloneNode(true);
        cloneBody.querySelectorAll('#km-menu, #km-button, [class*="explanation"], [class*="feedback"]').forEach(e => e.remove());
        return mathDecoder.extractDeepText(cloneBody).slice(0, 1500);
    }

    // =========================================================================
    // === ALTERAÇÃO DIRETA DO TEXTO NO DOM ("Certo" / "Errado")                ===
    // =========================================================================

    function modificarTextosDasAlternativas(alternativas, letrasCorretas) {
        alternativas.forEach(alt => {
            const eCorreta = letrasCorretas.includes(alt.letra);
            const novoTexto = eCorreta ? "✅ Certo" : "❌ Errado";

            // Tenta encontrar o nó filho de texto para não destruir a funcionalidade de clique do elemento principal
            const target = alt.elemento.querySelector('[class*="content"], [class*="text"], label, span') || alt.elemento;

            if (target) {
                target.innerHTML = `<span style="font-size: 18px; font-weight: bold; color: ${eCorreta ? '#22c55e' : '#ef4444'};">${novoTexto}</span>`;
            }

            // Aplica estilização de destaque visual na caixa da alternativa
            if (eCorreta) {
                alt.elemento.style.border = "3px solid #22c55e";
                alt.elemento.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                alt.elemento.style.borderRadius = "8px";
                alt.elemento.style.opacity = "1";
            } else {
                alt.elemento.style.border = "1px solid #ef4444";
                alt.elemento.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
                alt.elemento.style.borderRadius = "8px";
                alt.elemento.style.opacity = "0.5";
            }
        });

        // Rola até a alternativa correta
        const primeiraCorreta = alternativas.find(a => letrasCorretas.includes(a.letra));
        if (primeiraCorreta && primeiraCorreta.elemento) {
            primeiraCorreta.elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // =========================================================================
    // === CONSULTA DE INTELIGÊNCIA ARTIFICIAL                                   ===
    // =========================================================================

    async function obterRespostaEAplicar() {
        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando a página e reescrevendo alternativas...";

        try {
            const alternativas = detectAllAlternatives();
            const enunciado = extractQuestionText(alternativas);

            if (alternativas.length < 2) {
                respostaDiv.innerHTML = `
                    <div style="color: #ef4444; font-weight: bold;">⚠️ Leitura Incompleta</div>
                    Foram encontradas apenas ${alternativas.length} opções.<br>
                    <small style="color: #a1a1aa;">Role a tela até as alternativas ficarem totalmente visíveis e tente novamente.</small>
                `;
                return;
            }

            let blocoPrompt = `ENUNCIADO DA QUESTÃO:\n${enunciado}\n\n`;
            blocoPrompt += `ALTERNATIVAS PARA ANÁLISE:\n`;
            alternativas.forEach(a => {
                blocoPrompt += `[Opção ${a.letra}]: ${a.textoOriginal}\n`;
            });

            const sistemaInstrucao = `Você é um resolvedor especialista em matemática.
Analise a questão e determine qual opção é a correta.
Responda EXATAMENTE neste formato:

LETRAS: [Letra da alternativa correta, ex: B]
EXPLICAÇÃO: [Breve justificativa]`;

            const response = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: sistemaInstrucao },
                        { role: "user", content: blocoPrompt }
                    ],
                    model: "openai"
                })
            });

            if (!response.ok) throw new Error("Erro de resposta: " + response.status);

            const resultadoTexto = await response.text();

            if (resultadoTexto) {
                const matchLetras = resultadoTexto.match(/LETRAS?:\s*([A-Ha-h\s,eE]+)/i);
                let letrasEncontradas = [];

                if (matchLetras) {
                    letrasEncontradas = matchLetras[1]
                        .toUpperCase()
                        .replace(/\s+E\s+/g, ',')
                        .split(/[,\s]+/)
                        .filter(l => l.length === 1 && l >= 'A' && l <= 'H');
                }

                if (letrasEncontradas.length > 0) {
                    // Substitui o texto das alternativas na tela por "Certo" ou "Errado"
                    modificarTextosDasAlternativas(alternativas, letrasEncontradas);
                }

                respostaDiv.innerHTML = `
                    <div style="font-size: 15px; font-weight: bold; color: #22c55e; margin-bottom: 6px;">
                        🎯 Alternativa Alterada: Opção ${letrasEncontradas.join(', ')}
                    </div>
                    <div style="color: #f4f4f5; margin-bottom: 8px;">
                        ${resultadoTexto.replace(/\n/g, "<br>")}
                    </div>
                    <div class="km-meta-info">
                        Status: Alternativas trocadas por "Certo" e "Errado" na tela!<br>
                        Total de opções processadas: ${alternativas.length}
                    </div>
                `;
            }

        } catch (error) {
            respostaDiv.innerHTML = "❌ <b>Erro durante o processamento:</b> " + error.message;
        }
    }

    document.querySelector("#analisar").onclick = () => {
        const btn = document.querySelector("#analisar");
        const extra = document.querySelector("#extra");

        btn.textContent = "Analisar página 100% ON";
        btn.style.background = "#fff";
        btn.style.color = "#000";

        extra.innerHTML = `
            <button class="km-btn" id="questao" style="background:#22c55e; color:#000;">
                Trocar Rótulos para "Certo" / "Errado"
            </button>
        `;

        document.querySelector("#questao").onclick = () => {
            obterRespostaEAplicar();
        };
    };

})();
