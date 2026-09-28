(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo no navegador!");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // Estilos da interface e destaques visuais
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
        .km-correta-highlight {
            border: 3px solid #22c55e !important;
            background-color: rgba(34, 197, 94, 0.2) !important;
            box-shadow: 0 0 18px rgba(34, 197, 94, 0.6) !important;
            border-radius: 8px !important;
            transition: all 0.3s ease !important;
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "km-button";
    button.textContent = "🍷";

    const menu = document.createElement("div");
    menu.id = "km-menu";
    menu.innerHTML = `
        <h3 style="margin: 0 0 12px 0; text-align: center; color: #fff; font-size: 18px;">KhanMESSIAS v6.0 Ultra</h3>
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
    // === DECODIFICADOR DE LATEX / OCULTOS / KA TEX / MATHML                  ===
    // =========================================================================

    const mathDecoder = {
        cleanTeX(tex) {
            if (!tex) return "";
            return tex
                .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
                .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
                .replace(/\\text\{([^}]+)\}/g, "$1")
                .replace(/\\mathrm\{([^}]+)\}/g, "$1")
                .replace(/\\mathbf\{([^}]+)\}/g, "$1")
                .replace(/\\operatorname\{([^}]+)\}/g, "$1")
                .replace(/\\angle\s*([A-Za-z0-9]+)?/g, "∠$1")
                .replace(/\\degree/g, "°")
                .replace(/\\sin/g, "sen")
                .replace(/\\cos/g, "cos")
                .replace(/\\tan|\\tg/g, "tg")
                .replace(/\\theta/g, "θ")
                .replace(/\\alpha/g, "α")
                .replace(/\\beta/g, "β")
                .replace(/\\left|\\right/g, "")
                .replace(/\s+/g, " ")
                .trim();
        },

        extractDeepText(node) {
            if (!node) return "";
            if (node.id === "km-menu" || node.id === "km-button") return "";

            // 1. Verificar códigos LaTeX Ocultos (tags annotation, data-latex ou aria-label)
            if (node.querySelector) {
                const hiddenTeX = node.querySelector('annotation[encoding*="tex"], [data-latex]');
                if (hiddenTeX) {
                    const tex = hiddenTeX.textContent || hiddenTeX.getAttribute('data-latex');
                    if (tex && tex.trim()) return this.cleanTeX(tex);
                }
            }

            // 2. Se o próprio elemento possui aria-label com a fórmula
            if (node.getAttribute) {
                const ariaLabel = node.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.trim()) return this.cleanTeX(ariaLabel);
            }

            // 3. Nó de texto puro
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;

            // 4. Ignorar tags de script/estilo
            const tagName = node.tagName ? node.tagName.toLowerCase() : "";
            if (['script', 'style', 'noscript', 'template'].includes(tagName)) return "";

            // 5. Frações estruturadas no DOM KaTeX/MathML
            if (node.classList && (node.classList.contains('mfrac') || node.classList.contains('katex-mfrac'))) {
                const num = node.querySelector('.num, .katex-numerator, mrow:first-child');
                const den = node.querySelector('.den, .katex-denominator, mrow:last-child');
                if (num && den) {
                    return `(${this.extractDeepText(num)} / ${this.extractDeepText(den)})`;
                }
            }

            // Recursão para nós filhos
            let text = "";
            for (let child of node.childNodes) {
                text += this.extractDeepText(child) + " ";
            }

            return this.cleanTeX(text);
        }
    };

    // =========================================================================
    // === DETECÇÃO E VARREDURA DE ALTERNATIVAS NA PÁGINA INTEIRA               ===
    // =========================================================================

    function detectAllAlternatives() {
        const ignoreElements = (el) => {
            if (!el) return true;
            if (menu.contains(el) || button.contains(el)) return true;
            if (el.closest('#km-menu, #km-button')) return true;
            
            // Ignora botões de controle e navegação do Khan
            const txt = (el.innerText || "").toLowerCase();
            if (txt.includes('verificar') || txt.includes('pular') || txt.includes('mostrar a explicação')) return true;
            return false;
        };

        let rawElements = [];

        // Nível 1: Seletores Específicos do Khan Academy (Mobile & Desktop)
        const seletoresKhan = [
            '[data-testid*="radio-option"]',
            '[data-testid*="choice"]',
            '[data-testid*="option"]',
            '.perseus-radio-option',
            '.perseus-radio-option-content',
            '[class*="radio-option"]',
            '[class*="choice-option"]',
            '[role="radio"]',
            '[role="checkbox"]'
        ];

        rawElements = Array.from(document.querySelectorAll(seletoresKhan.join(', ')))
            .filter(el => !ignoreElements(el));

        // Nível 2: Fallback por Inputs (Radio/Checkbox)
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

        // Nível 3: Fallback de Estrutura Visual (Blocos com letras A, B, C, D)
        if (rawElements.length < 2) {
            const blocosComLetra = Array.from(document.querySelectorAll('li, label, div[class*="option"]'))
                .filter(el => {
                    if (ignoreElements(el)) return false;
                    const txt = (el.innerText || "").trim();
                    return /^[A-E]\b/.test(txt) || el.querySelector('svg, math, annotation');
                });
            rawElements = [...new Set([...rawElements, ...blocosComLetra])];
        }

        // Filtragem final para garantir opções únicas e limpas
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
                        texto: textoExtraido,
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

        // Remove o menu do script e os elementos das alternativas para isolar o enunciado
        cloneBody.querySelectorAll('#km-menu, #km-button, [class*="explanation"], [class*="feedback"]').forEach(e => e.remove());
        
        alternativas.forEach(alt => {
            if (alt.elemento && alt.elemento.id) {
                const elClone = cloneBody.querySelector('#' + CSS.escape(alt.elemento.id));
                if (elClone) elClone.remove();
            }
        });

        return mathDecoder.extractDeepText(cloneBody).slice(0, 1500);
    }

    // =========================================================================
    // === EXECUÇÃO DA IA E DESTAQUE NA TELA                                    ===
    // =========================================================================

    function destacarAlternativasCorretas(listaAlternativas) {
        document.querySelectorAll('.km-correta-highlight').forEach(el => {
            el.classList.remove('km-correta-highlight');
        });

        if (!listaAlternativas || listaAlternativas.length === 0) return;

        listaAlternativas.forEach(alt => {
            if (alt && alt.elemento) {
                alt.elemento.classList.add('km-correta-highlight');
            }
        });

        if (listaAlternativas[0] && listaAlternativas[0].elemento) {
            listaAlternativas[0].elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    async function obterRespostaSemKey() {
        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Realizando varredura profunda na página...";

        try {
            const alternativas = detectAllAlternatives();
            const enunciado = extractQuestionText(alternativas);

            console.log("=== VARREDURA KHANMESSIAS v6.0 ===");
            console.log("Enunciado lido:", enunciado);
            console.log("Alternativas encontradas:", alternativas);

            if (alternativas.length < 2) {
                respostaDiv.innerHTML = `
                    <div style="color: #ef4444; font-weight: bold;">⚠️ Leitura Incompleta</div>
                    O script encontrou ${alternativas.length} opção(ões).<br>
                    <small style="color: #a1a1aa;">Role a página levemente para que as opções fiquem visíveis e tente novamente.</small>
                `;
                return;
            }

            let blocoPrompt = `ENUNCIADO DA QUESTÃO:\n${enunciado}\n\n`;
            blocoPrompt += `ALTERNATIVAS DISPONÍVEIS (Escolha estritamente entre estas):\n`;
            alternativas.forEach(a => {
                blocoPrompt += `[Opção ${a.letra}]: ${a.texto}\n`;
            });

            const sistemaInstrucao = `Você é um resolvedor especialista em matemática.
Análise a questão e selecione a alternativa correta exclusivamente a partir das opções fornecidas.
Responda EXATAMENTE neste formato:

LETRAS: [Letra da opção correta, ex: B]
EXPLICAÇÃO: [Breve explicação direta]`;

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

            if (!response.ok) throw new Error("Erro de conexão: " + response.status);

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

                const alternativasCorretas = alternativas.filter(a => letrasEncontradas.includes(a.letra));

                if (alternativasCorretas.length > 0) {
                    destacarAlternativasCorretas(alternativasCorretas);
                }

                respostaDiv.innerHTML = `
                    <div style="font-size: 15px; font-weight: bold; color: #22c55e; margin-bottom: 6px;">
                        🎯 Resposta Correta: ${letrasEncontradas.length > 0 ? `Opção ${letrasEncontradas.join(', ')}` : 'Identificada'}
                    </div>
                    <div style="color: #f4f4f5; margin-bottom: 8px;">
                        ${resultadoTexto.replace(/\n/g, "<br>")}
                    </div>
                    <div class="km-meta-info">
                        Status: ${alternativasCorretas.length} opção(ões) destacada(s)!<br>
                        Opções detectadas na varredura: ${alternativas.length}
                    </div>
                `;
            }

        } catch (error) {
            respostaDiv.innerHTML = "❌ <b>Erro durante a análise:</b> " + error.message;
        }
    }

    document.querySelector("#analisar").onclick = () => {
        const btn = document.querySelector("#analisar");
        const extra = document.querySelector("#extra");
        const respostaDiv = document.querySelector("#km-resposta");

        btn.textContent = "Analisar página 100% ON";
        btn.style.background = "#fff";
        btn.style.color = "#000";

        extra.innerHTML = `
            <button class="km-btn" id="questao" style="background:#22c55e; color:#000;">
                Obter Resposta e Destacar
            </button>
        `;

        document.querySelector("#questao").onclick = () => {
            obterRespostaSemKey();
        };
    };

})();
