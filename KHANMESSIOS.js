(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    const state = {
        analyzing: false,
        diagnosticMode: true
    };

    const style = document.createElement("style");
    style.textContent = `
        #km-button {
            position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
            border-radius: 50%; border: none; background: #171717; color: white;
            font-size: 28px; z-index: 999999; cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        #km-menu {
            position: fixed; right: 20px; bottom: 90px; width: 290px; background: #1e1e1e;
            color: white; padding: 15px; border-radius: 15px; display: none;
            z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 10px 25px rgba(0,0,0,0.6); border: 1px solid #333;
        }
        .km-btn {
            width: 100%; padding: 12px; margin-top: 10px; border: none;
            border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;
            transition: background 0.2s;
        }
        #km-resposta {
            margin-top: 15px; padding: 12px; background: #2a2a2a; border-radius: 8px;
            color: #00ff66; font-size: 13px; display: none; word-wrap: break-word;
            max-height: 280px; overflow-y: auto; border: 1px solid #444;
        }
        .km-meta-info {
            font-size: 11px; color: #aaa; margin-top: 8px; border-top: 1px solid #444; padding-top: 6px;
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
        <h3 style="margin: 0 0 10px 0; text-align: center; color: #fff;">KhanMESSIAS</h3>
        <button class="km-btn" id="analisar" style="background:#333; color:#fff;">Analisar página 100% OFF</button>
        <div id="extra"></div>
        <div id="km-resposta"></div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(menu);

    button.onclick = () => {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    };

    // =========================================================================
    // === SISTEMA DE NORMALIZAÇÃO E EXTRAÇÃO SEMÂNTICA (WEB & MOBILE)        ===
    // =========================================================================

    const mathNormalizer = {
        clean(texto) {
            if (!texto) return "";
            return texto
                .replace(/\\(?:text|mathrm|mathbf|mathsf|mathtt|operatorname)\{([^}]+)\}/g, "$1")
                .replace(/\\m?angle/g, "∠")
                .replace(/\\degree/g, "°")
                .replace(/\\sin/g, "sen")
                .replace(/\\cos/g, "cos")
                .replace(/\\tan/g, "tan")
                .replace(/\\theta/g, "θ")
                .replace(/\\alpha/g, "α")
                .replace(/\\beta/g, "β")
                .replace(/\s+/g, " ")
                .replace(/\s*=\s*/g, " = ")
                .replace(/\s*\+\s*/g, " + ")
                .replace(/\s*-\s*/g, " - ")
                .replace(/\s*\*s*/g, " * ")
                .replace(/\s*\/\s*/g, " / ")
                .replace(/\(\s+/g, "(")                 .replace(/\s+\)/g, ")")
                .trim();
        }
    };

    function reconstructStructuralText(node) {
        if (!node) return "";
        
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tagName = node.tagName.toLowerCase();
        
        if (['script', 'style', 'noscript', 'template'].includes(tagName)) return "";
        if (node.id === "km-menu" || node.id === "km-button") return "";

        // Evita duplicar fórmulas KaTeX geradas em HTML e MathML simultaneamente
        if (node.classList && node.classList.contains('katex-html') && node.parentElement && node.parentElement.querySelector('.katex-mathml')) {
            return "";
        }

        if (tagName === 'sup') return `^(${reconstructChildren(node)})`;
        if (tagName === 'sub') return `_(${reconstructChildren(node)})`;

        if ((node.classList && node.classList.contains('mfrac')) || tagName === 'mfrac') {
            const num = node.querySelector('.num, mrow:first-child') || node.children[0];
            const den = node.querySelector('.den, mrow:last-child') || node.children[1];
            if (num && den) {
                return `(${reconstructStructuralText(num)} / ${reconstructStructuralText(den)})`;
            }
        }

        return reconstructChildren(node);
    }

    function reconstructChildren(node) {
        let text = "";
        for (let child of node.childNodes) {
            text += reconstructStructuralText(child);
        }
        return text;
    }

    function extractSemanticContent(elemento) {
        if (!elemento) return "";

        // 1. Atributos de acessibilidade
        const ariaLabel = elemento.getAttribute("aria-label") || 
                          elemento.getAttribute("aria-description") || 
                          elemento.getAttribute("title") || 
                          elemento.getAttribute("alt");
        if (ariaLabel && ariaLabel.trim().length > 0) {
            return mathNormalizer.clean(ariaLabel);
        }

        // 2. Anotações LaTeX embutidas (KaTeX / Khan Academy Perseus)
        const texAnnotations = elemento.querySelectorAll('annotation[encoding*="tex"], .katex-mathml annotation, [data-latex]');
        if (texAnnotations.length > 0) {
            const list = Array.from(texAnnotations)
                .map(a => a.textContent || a.getAttribute('data-latex') || "")
                .filter(t => t.trim().length > 0);
            if (list.length > 0) {
                return mathNormalizer.clean(list.join(" "));
            }
        }

        // 3. MathML Nativo
        const mathNodes = elemento.querySelectorAll('math');
        if (mathNodes.length > 0) {
            const mathTexts = Array.from(mathNodes).map(m => {
                const ann = m.querySelector('annotation');
                return ann ? ann.textContent : m.textContent;
            });
            if (mathTexts.join("").trim().length > 0) {
                return mathNormalizer.clean(mathTexts.join(" "));
            }
        }

        // 4. Elementos SVG
        if (elemento.tagName.toLowerCase() === 'svg' || (elemento.querySelectorAll('svg').length > 0 && !elemento.innerText.trim())) {
            const svgText = parseSVGElement(elemento);
            if (svgText) return mathNormalizer.clean(svgText);
        }

        // 5. Varredura recursiva de nós
        const structuralText = reconstructStructuralText(elemento);
        if (structuralText.trim().length > 0) {
            return mathNormalizer.clean(structuralText);
        }

        return mathNormalizer.clean(elemento.innerText || elemento.textContent || "");
    }

    // =========================================================================
    // === PROCESSADORES DE GRÁFICOS, SVGs E IMAGENS                            ===
    // =========================================================================

    function parseSVGElement(container) {
        const svgs = container.tagName && container.tagName.toLowerCase() === 'svg' 
            ? [container] 
            : Array.from(container.querySelectorAll('svg'));
            
        if (!svgs.length) return "";

        const descricoes = [];
        svgs.forEach((svg, idx) => {
            const infos = [];
            const aria = svg.getAttribute('aria-label') || svg.getAttribute('title');
            if (aria) infos.push(`Rótulo: "${aria}"`);

            const textosSVG = Array.from(svg.querySelectorAll('text, tspan'))
                .map(t => t.textContent.trim())
                .filter(Boolean);
                
            if (textosSVG.length) {
                infos.push(`Textos no SVG: [${textosSVG.join(', ')}]`);
            }

            const formas = svg.querySelectorAll('line, path, circle, rect, polygon');
            const viewBox = svg.getAttribute('viewBox');
            if (formas.length > 0) {
                infos.push(`Formas: ${formas.length}${viewBox ? ` (viewBox: ${viewBox})` : ''}`);
            }

            if (infos.length) {
                descricoes.push(`[SVG #${idx + 1}: ${infos.join(' | ')}]`);
            }
        });

        return descricoes.join('\n');
    }

    function parseCanvasElements(container) {
        const canvases = Array.from(container.querySelectorAll('canvas'));
        if (!canvases.length) return [];

        return canvases.map((canvas, idx) => {
            const aria = canvas.getAttribute('aria-label') || canvas.getAttribute('title') || canvas.getAttribute('role');
            const parentText = canvas.parentElement ? canvas.parentElement.getAttribute('aria-label') : '';
            return `[Canvas #${idx + 1}: ${aria || parentText || 'Sem descrição'}]`;
        });
    }

    function parseImageElements(container) {
        const imgs = Array.from(container.querySelectorAll('img, picture'));
        if (!imgs.length) return [];

        return imgs.map((img, idx) => {
            const alt = img.getAttribute('alt') || img.getAttribute('title') || img.getAttribute('aria-label');
            const caption = img.closest('figure')?.querySelector('figcaption')?.textContent;
            return `[Imagem #${idx + 1}: Alt="${alt || 'sem alt'}"${caption ? ` | Legenda="${caption.trim()}"` : ''}]`;
        });
    }

    // =========================================================================
    // === DETECÇÃO DE REGIÃO DA QUESTÃO E ALTERNATIVAS (AMPLIADO KHAN)        ===
    // =========================================================================

    function findQuestionContainer() {
        const candidatos = [
            document.querySelector('[data-testid="exercise-question"]'),
            document.querySelector('[data-testid="question-description"]'),
            document.querySelector('.perseus-renderer'),
            document.querySelector('.framework-content'),
            document.querySelector('[data-testid="perseus-renderer"]'),
            document.querySelector('main'),
            document.querySelector('[role="main"]'),
            document.querySelector('article')
        ].filter(Boolean);

        if (candidatos.length > 0) return candidatos[0];

        let melhorContainer = document.body;
        let maxPontuacao = 0;

        document.querySelectorAll('div, section, article').forEach(el => {
            if (el.id === 'km-menu' || el.contains(menu)) return;
            const qtdOpcoes = el.querySelectorAll('button, input, [role="radio"], [data-testid*="option"], [class*="option"]').length;
            const tamTexto = (el.innerText || '').length;
            const pontuacao = tamTexto + (qtdOpcoes * 150);

            if (pontuacao > maxPontuacao && tamTexto < 15000) {
                maxPontuacao = pontuacao;
                melhorContainer = el;
            }
        });

        return melhorContainer;
    }

    function detectAlternatives(container) {
        // Seletores ampliados para Khan Academy Mobile, Web e Perseus Engine
        const seletores = [
            '[data-testid*="perseus-radio-option"]',
            '[data-testid*="radio-option"]',
            '[data-testid*="option"]',
            '[class*="perseus-radio-option"]',
            '[class*="radio-option"]',
            '[class*="choice-option"]',
            '[role="radio"]',
            '[role="checkbox"]',
            'input[type="radio"]',
            'input[type="checkbox"]',
            'ul[class*="option"] > li',
            'ol[class*="option"] > li',
            'fieldset label',
            'fieldset > div',
            'button[class*="option"]',
            'div[aria-checked]',
            'div[class*="field-"]'
        ];

        let elementos = Array.from(container.querySelectorAll(seletores.join(', ')))
            .filter(el => !menu.contains(el) && el.id !== 'km-button');

        // Fallback de contingência para listas sem seletores declarados
        if (elementos.length === 0) {
            elementos = Array.from(container.querySelectorAll('li, div[class*="choice"]'))
                .filter(el => !menu.contains(el) && el.innerText && el.innerText.length > 0 && el.innerText.length < 500);
        }

        const alternativas = [];
        const textosVistos = new Set();
        const botoesIgnorados = ['Analisar página', 'Obter Resposta', 'Verificar', 'Enviar', 'Próxima pergunta', 'Pular', 'Dica', 'Ajuda'];

        elementos.forEach((el) => {
            const textoNormalizado = extractSemanticContent(el);
            
            if (
                textoNormalizado && 
                textoNormalizado.length > 0 && 
                !textosVistos.has(textoNormalizado) &&
                !botoesIgnorados.some(b => textoNormalizado.toLowerCase().includes(b.toLowerCase()))
            ) {
                textosVistos.add(textoNormalizado);
                alternativas.push({
                    texto: textoNormalizado,
                    elemento: el,
                    tipo: el.getAttribute('role') || el.tagName.toLowerCase(),
                    indice: alternativas.length
                });
            }
        });

        return alternativas;
    }

    function analyzePageStructure() {
        const container = findQuestionContainer();

        const alternativas = detectAlternatives(container);

        const elementosMath = Array.from(container.querySelectorAll('.katex, math, .MathJax, [data-latex]'))
            .map(m => extractSemanticContent(m))
            .filter(Boolean);

        const graficosSVG = parseSVGElement(container);
        const graficosCanvas = parseCanvasElements(container);

        const imagens = parseImageElements(container);

        const cloneContainer = container.cloneNode(true);
        alternativas.forEach(alt => {
            const correspondente = cloneContainer.querySelector(`[role="${alt.tipo}"]`) || cloneContainer;
            if (correspondente && correspondente !== cloneContainer) {
                correspondente.remove();
            }
        });

        const textoEnunciado = extractSemanticContent(cloneContainer);

        return {
            container: container,
            enunciado: textoEnunciado,
            alternativas: alternativas,
            matematica: [...new Set(elementosMath)],
            graficos: [graficosSVG, ...graficosCanvas].filter(Boolean),
            imagens: imagens,
            qualidadeLeitura: alternativas.length > 0 ? "Alta" : "Média (Lendo texto corrido)"
        };
    }

    function runDiagnostic(analise) {
        console.group("%c=== ANÁLISE DA PÁGINA (KHANMESSIAS) ===", "color: #a777e3; font-weight: bold; font-size: 14px;");
        console.log("%cQUESTÃO ENUNCIADO:", "color: #4facfe; font-weight: bold;", analise.enunciado);
        
        console.group("%cALTERNATIVAS ENCONTRADAS:", "color: #00ff00; font-weight: bold;");
        if (analise.alternativas.length === 0) {
            console.log("Nenhuma alternativa identificada explicitamente por seletores.");
        } else {
            analise.alternativas.forEach(alt => {
                console.log(`[${alt.indice}] %c${alt.texto}%c (Tipo: ${alt.tipo})`, "color: #fff; font-weight: bold;", "color: #888;");
            });
        }
        console.groupEnd();

        console.log("%cMATEMÁTICA DETECTADA:", "color: #ff9800; font-weight: bold;", analise.matematica);
        console.log("%cGRÁFICOS DETECTADOS:", "color: #e91e63; font-weight: bold;", analise.graficos);
        console.log("%cIMAGENS DETECTADAS:", "color: #00bcd4; font-weight: bold;", analise.imagens);
        console.log("%cQUALIDADE DA LEITURA:", "color: #28a745; font-weight: bold;", analise.qualidadeLeitura);
        console.groupEnd();
    }

    // =========================================================================

    async function obterRespostaSemKey(textoDaPagina) {
        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando estrutura profunda da página...";

        try {
            const analise = analyzePageStructure();

            if (state.diagnosticMode) {
                runDiagnostic(analise);
            }

            let blocoPrompt = `ENUNCIADO DA QUESTÃO:\n${analise.enunciado}\n\n`;

            if (analise.alternativas.length > 0) {
                blocoPrompt += `ALTERNATIVAS:\n` + analise.alternativas.map(a => `[Opção ${a.indice + 1}]: ${a.texto}`).join('\n') + `\n\n`;
            } else {
                blocoPrompt += `TEXTO BRUTO DA PÁGINA:\n${textoDaPagina.slice(0, 2000)}\n\n`;
            }

            if (analise.matematica.length > 0) {
                blocoPrompt += `EXPRESSÕES MATEMÁTICAS:\n` + analise.matematica.join(' | ') + `\n\n`;
            }

            if (analise.graficos.length > 0) {
                blocoPrompt += `GRÁFICOS/SVG:\n` + analise.graficos.join('\n') + `\n\n`;
            }

            if (analise.imagens.length > 0) {
                blocoPrompt += `IMAGENS:\n` + analise.imagens.join('\n') + `\n\n`;
            }

            const textoFinal = blocoPrompt.slice(0, 3800);

            const response = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "Você é um resolvedor de questões altamente preciso. Analise a questão e as alternativas fornecidas. Retorne APENAS A RESPOSTA FINAL (ex: a letra da alternativa correta ou o valor exato). Não dê explicações, nem saudações."
                        },
                        {
                            role: "user",
                            content: textoFinal
                        }
                    ],
                    model: "openai"
                })
            });

            if (!response.ok) {
                throw new Error("Erro na conexão com o servidor de IA: " + response.status);
            }

            const resultadoTexto = await response.text();

            if (resultadoTexto) {
                respostaDiv.innerHTML = `
                    🎯 <b>Resposta:</b><br>${resultadoTexto.trim().replace(/\n/g, "<br>")}
                    <div class="km-meta-info">
                        Leitura: ${analise.qualidadeLeitura} | Alternativas encontradas: ${analise.alternativas.length}<br>
                        <i>(Detalhes no Console F12)</i>
                    </div>
                `;
            } else {
                throw new Error("Nenhuma resposta foi gerada.");
            }

        } catch (error) {
            respostaDiv.innerHTML = "❌ <b>Erro:</b> " + error.message;
        }
    }

    document.querySelector("#analisar").onclick = () => {
        state.analyzing = !state.analyzing;
        const btn = document.querySelector("#analisar");
        const extra = document.querySelector("#extra");
        const respostaDiv = document.querySelector("#km-resposta");

        if (state.analyzing) {
            btn.textContent = "Analisar página 100% ON";
            btn.style.background = "#fff";
            btn.style.color = "#000";

            extra.innerHTML = `
                <button class="km-btn" id="questao" style="background:#28a745; color:#fff;">
                    Obter Resposta (Sem API Key)
                </button>
            `;

            document.querySelector("#questao").onclick = () => {
                const texto = document.body.innerText;
                obterRespostaSemKey(texto);
            };

        } else {
            btn.textContent = "Analisar página 100% OFF";
            btn.style.background = "";
            btn.style.color = "";
            extra.innerHTML = "";
            respostaDiv.style.display = "none";
        }
    };

})();
