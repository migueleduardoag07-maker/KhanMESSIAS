(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    const state = {
        analyzing: false,
        diagnosticMode: true // Ativa diagnósticos detalhados no console por padrão
    };

    const style = document.createElement("style");
    style.textContent = `
        #km-button {
            position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
            border-radius: 50%; border: none; background: #171717; color: white;
            font-size: 28px; z-index: 999999; cursor: pointer;
        }
        #km-menu {
            position: fixed; right: 20px; bottom: 90px; width: 280px; background: #222;
            color: white; padding: 15px; border-radius: 15px; display: none;
            z-index: 999999; font-family: Arial, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .km-btn {
            width: 100%; padding: 10px; margin-top: 10px; border: none;
            border-radius: 8px; cursor: pointer; font-weight: bold;
        }
        #km-resposta {
            margin-top: 15px; padding: 10px; background: #333; border-radius: 8px;
            color: #00ff00; font-size: 13px; display: none; word-wrap: break-word;
            max-height: 250px; overflow-y: auto;
        }
        .km-meta-info {
            font-size: 11px; color: #aaa; margin-top: 5px; border-top: 1px solid #444; padding-top: 5px;
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "km-button";
    button.textContent = "🍷";

    const menu = document.createElement("div");
    menu.id = "km-menu";
    menu.innerHTML = `
        <h3 style="margin: 0 0 10px 0; text-align: center;">KhanMESSIAS</h3>
        <button class="km-btn" id="analisar">Analisar página 100% OFF</button>
        <div id="extra"></div>
        <div id="km-resposta"></div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(menu);

    button.onclick = () => {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    };

    // =========================================================================
    // === NOVO: CAMADA 2 & 3 - NORMALIZADOR MATEMÁTICO E EXTRAÇÃO DE STRUCT ===
    // =========================================================================

    const mathNormalizer = {
        clean(texto) {
            if (!texto) return "";
            return texto
                .replace(/\\(?:text|mathrm|mathbf|mathsf|mathtt)\{([^}]+)\}/g, "$1") // Remove invólucros TeX simples
                .replace(/\s+/g, " ")                  // Unifica múltiplos espaços e quebras
                .replace(/\s*=\s*/g, " = ")             // Padroniza igualdade
                .replace(/\s*\+\s*/g, " + ")             // Padroniza adição
                .replace(/\s*-\s*/g, " - ")             // Padroniza subtração
                .replace(/\s*\*s*/g, " * ")             // Padroniza multiplicação
                .replace(/\s*\/\s*/g, " / ")             // Padroniza divisão
                .replace(/\(\s+/g, "(")                 .replace(/\s+\)/g, ")")
                .trim();
        }
    };

    /**
     * Reconstrói textos e expressões de nós fragmentados (ex: múltiplos <span> aninhados, KaTeX, MathML)
     */
    function reconstructStructuralText(node) {
        if (!node) return "";
        
        // Nó de Texto Simples
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tagName = node.tagName.toLowerCase();
        
        // Ignora elementos invisíveis ou irrelevantes
        if (['script', 'style', 'noscript', 'template'].includes(tagName)) return "";
        if (node.id === "km-menu" || node.id === "km-button") return "";

        // Evita duplicar textos visíveis quando KaTeX inclui versão HTML e MathML juntas
        if (node.classList.contains('katex-html') && node.parentElement && node.parentElement.querySelector('.katex-mathml')) {
            return "";
        }

        // Trata sobrescritos e subscritos
        if (tagName === 'sup') return `^(${reconstructChildren(node)})`;
        if (tagName === 'sub') return `_(${reconstructChildren(node)})`;

        // Trata frações
        if (node.classList.contains('mfrac') || tagName === 'mfrac') {
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

    /**
     * Função Central: extractSemanticContent
     * Tenta obter a representação semântica mais rica de um elemento por fallbacks sucessivos.
     */
    function extractSemanticContent(elemento) {
        if (!elemento) return "";

        // 1. Acessibilidade explícita
        const ariaLabel = elemento.getAttribute("aria-label") || 
                          elemento.getAttribute("aria-description") || 
                          elemento.getAttribute("title") || 
                          elemento.getAttribute("alt");
        if (ariaLabel && ariaLabel.trim().length > 0) {
            return mathNormalizer.clean(ariaLabel);
        }

        // 2. Anotações TeX em KaTeX ou MathML
        const texAnnotations = elemento.querySelectorAll('annotation[encoding*="tex"], .katex-mathml annotation, [data-latex]');
        if (texAnnotations.length > 0) {
            const list = Array.from(texAnnotations)
                .map(a => a.textContent || a.getAttribute('data-latex') || "")
                .filter(t => t.trim().length > 0);
            if (list.length > 0) {
                return mathNormalizer.clean(list.join(" "));
            }
        }

        // 3. MathML Nativo (<math>)
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

        // 4. Se for SVG ou contiver SVG interno
        if (elemento.tagName.toLowerCase() === 'svg' || (elemento.querySelectorAll('svg').length > 0 && !elemento.innerText.trim())) {
            const svgText = parseSVGElement(elemento);
            if (svgText) return mathNormalizer.clean(svgText);
        }

        // 5. Reconstrução estrutural profunda (split spans, sub/sup, etc.)
        const structuralText = reconstructStructuralText(elemento);
        if (structuralText.trim().length > 0) {
            return mathNormalizer.clean(structuralText);
        }

        // 6. Fallback final
        return mathNormalizer.clean(elemento.innerText || elemento.textContent || "");
    }

    // =========================================================================
    // === NOVO: CAMADA 5 & 6 - PROCESSADOR DE GRÁFICOS, SVGs E IMAGENS       ===
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
                infos.push(`Formas/Linhas: ${formas.length}${viewBox ? ` (viewBox: ${viewBox})` : ''}`);
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
            return `[Canvas #${idx + 1}: ${aria || parentText || 'Elemento gráfico Canvas sem descrição acessível'}]`;
        });
    }

    function parseImageElements(container) {
        const imgs = Array.from(container.querySelectorAll('img, picture'));
        if (!imgs.length) return [];

        return imgs.map((img, idx) => {
            const alt = img.getAttribute('alt') || img.getAttribute('title') || img.getAttribute('aria-label');
            const src = img.getAttribute('src') || '';
            const caption = img.closest('figure')?.querySelector('figcaption')?.textContent;
            return `[Imagem #${idx + 1}: Alt="${alt || 'sem alt'}"${caption ? ` | Legenda="${caption.trim()}"` : ''}]`;
        });
    }

    // =========================================================================
    // === NOVO: CAMADA 1, 4 & 7 - ANÁLISE MULTICAMADAS E DIAGNÓSTICO           ===
    // =========================================================================

    /**
     * Encontra a região principal da questão na página sem assumir seletores rígidos.
     */
    function findQuestionContainer() {
        const candidatos = [
            document.querySelector('.perseus-renderer'),
            document.querySelector('.framework-content'),
            document.querySelector('[role="main"]'),
            document.querySelector('main'),
            document.querySelector('article'),
            document.querySelector('.question-container')
        ].filter(Boolean);

        if (candidatos.length > 0) return candidatos[0];

        // Se nenhum seletor conhecido existir, busca a div com maior densidade de texto/interatividade
        let melhorContainer = document.body;
        let maxPontuacao = 0;

        document.querySelectorAll('div, section').forEach(el => {
            if (el.id === 'km-menu' || el.contains(menu)) return;
            const qtdBotoes = el.querySelectorAll('button, input, [role="radio"]').length;
            const tamTexto = (el.innerText || '').length;
            const pontuacao = tamTexto + (qtdBotoes * 100);

            if (pontuacao > maxPontuacao && tamTexto < 10000) {
                maxPontuacao = pontuacao;
                melhorContainer = el;
            }
        });

        return melhorContainer;
    }

    /**
     * Detecta dinamicamente quais elementos representam alternativas de resposta (Camada 4)
     */
    function detectAlternatives(container) {
        const seletores = [
            '[role="radio"]',
            '[role="checkbox"]',
            'input[type="radio"]',
            'input[type="checkbox"]',
            '.perseus-radio-option',
            '.perseus-interactive',
            'ul[class*="option"] li',
            'fieldset label',
            'button[class*="option"]',
            'div[data-test-id*="option"]',
            '[aria-checked]'
        ];

        const elementos = Array.from(container.querySelectorAll(seletores.join(', ')))
            .filter(el => !menu.contains(el) && el.id !== 'km-button');

        const alternativas = [];
        const textosVistos = new Set();

        elementos.forEach((el) => {
            const textoNormalizado = extractSemanticContent(el);
            
            // Evita duplicatas, opções vazias ou botões de sistema
            if (
                textoNormalizado && 
                textoNormalizado.length > 0 && 
                !textosVistos.has(textoNormalizado) &&
                !['Analisar página', 'Obter Resposta', 'Verificar', 'Enviar'].some(b => textoNormalizado.includes(b))
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

    /**
     * Sistema de Análise Completa em Camadas da Página
     */
    function analyzePageStructure() {
        const container = findQuestionContainer();

        // Camada 4: Alternativas
        const alternativas = detectAlternatives(container);

        // Camada 3: Expressões Matemáticas
        const elementosMath = Array.from(container.querySelectorAll('.katex, math, .MathJax, [data-latex]'))
            .map(m => extractSemanticContent(m))
            .filter(Boolean);

        // Camada 5: Gráficos
        const graficosSVG = parseSVGElement(container);
        const graficosCanvas = parseCanvasElements(container);

        // Camada 6: Imagens
        const imagens = parseImageElements(container);

        // Camada 2 & 1: Enunciado / Texto Geral da Questão
        // Clona o container para remover as alternativas e isolar o enunciado
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
            qualidadeLeitura: alternativas.length > 0 ? "Alta" : "Média (Sem alternativas explícitas)"
        };
    }

    /**
     * Imprime relatório no console para fins de depuração
     */
    function runDiagnostic(analise) {
        console.group("%c=== ANÁLISE DA PÁGINA (KHANMESSIAS) ===", "color: #a777e3; font-weight: bold; font-size: 14px;");
        console.log("%cQUESTÃO ENUNCIADO:", "color: #4facfe; font-weight: bold;", analise.enunciado);
        
        console.group("%cALTERNATIVAS ENCONTRADAS:", "color: #00ff00; font-weight: bold;");
        if (analise.alternativas.length === 0) {
            console.log("Nenhuma alternativa identificada explicitamente.");
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

    // Processador de IA sem necessidade de chave API (Atualizado para utilizar as Camadas)
    async function obterRespostaSemKey(textoDaPagina) {
        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando estrutura profunda da página...";

        try {
            // Executa a Análise Estrutural em Camadas
            const analise = analyzePageStructure();

            // Roda diagnóstico no console
            if (state.diagnosticMode) {
                runDiagnostic(analise);
            }

            // Constrói um payload rico para a I.A.
            let blocoPrompt = `ENUNCIADO DA QUESTÃO:\n${analise.enunciado}\n\n`;

            if (analise.alternativas.length > 0) {
                blocoPrompt += `ALTERNATIVAS:\n` + analise.alternativas.map(a => `[Opção ${a.indice + 1}]: ${a.texto}`).join('\n') + `\n\n`;
            }

            if (analise.matematica.length > 0) {
                blocoPrompt += `EXPRESSÕES MATEMÁTICAS RECONSTRUÍDAS:\n` + analise.matematica.join(' | ') + `\n\n`;
            }

            if (analise.graficos.length > 0) {
                blocoPrompt += `INFORMAÇÕES DE GRÁFICOS/SVG:\n` + analise.graficos.join('\n') + `\n\n`;
            }

            if (analise.imagens.length > 0) {
                blocoPrompt += `IMAGENS/DESCRIÇÕES:\n` + analise.imagens.join('\n') + `\n\n`;
            }

            const textoFinal = blocoPrompt.slice(0, 3800);

            // Requisição para servidor público gratuito
            const response = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "Você é um resolvedor de questões altamente preciso. Analise a questão e as alternativas fornecidas. Retorne APENAS A RESPOSTA FINAL (ex: a alternativa correta ou o valor exato). Não dê explicações, nem saudações."
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
                        Leitura: ${analise.qualidadeLeitura} | Alternativas: ${analise.alternativas.length}<br>
                        <i>(Detalhes impressos no Console F12)</i>
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
