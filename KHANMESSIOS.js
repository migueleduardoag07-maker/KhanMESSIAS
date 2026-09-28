(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo. Recarregue a página para reiniciar.");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // ==========================================
    // 1. INTERFACE GRÁFICA (UI)
    // ==========================================
    const style = document.createElement("style");
    style.textContent = `
        #km-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9);
            width: 90%; max-width: 420px; background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
            padding: 25px; color: #fff; font-family: -apple-system, sans-serif;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); z-index: 9999999;
            display: none; flex-direction: column; gap: 15px; opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-height: 80vh; overflow-y: auto;
        }
        #km-panel.show { display: flex; opacity: 1; transform: translate(-50%, -50%) scale(1); }
        #km-title { font-size: 18px; font-weight: 700; text-align: center; color: #4facfe; margin-bottom: 5px; }
        .km-btn {
            width: 100%; padding: 14px; border: none; border-radius: 10px;
            background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000;
            font-weight: 800; font-size: 15px; cursor: pointer; transition: 0.2s;
        }
        .km-btn:active { transform: scale(0.97); }
        .km-log {
            background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;
            font-family: monospace; font-size: 11px; color: #00ff00;
            word-wrap: break-word; white-space: pre-wrap; max-height: 100px; overflow-y: auto;
        }
        #km-result {
            background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px;
            font-size: 14px; line-height: 1.5; display: none; border-left: 4px solid #4facfe;
        }
        #km-close {
            position: absolute; top: 15px; right: 15px; background: none; border: none;
            color: #888; font-size: 24px; cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "km-panel";
    panel.innerHTML = `
        <button id="km-close">×</button>
        <div id="km-title">🤖 KhanMESSIAS v2.0 (Automated)</div>
        <button class="km-btn" id="km-analyze">Escanear Tudo e Resolver</button>
        <div id="km-log-container" style="display:none;">
            <div style="font-size:12px; color:#aaa; margin-bottom:5px;">🔍 Log de Varredura:</div>
            <div class="km-log" id="km-log"></div>
        </div>
        <div id="km-result"></div>
    `;
    document.body.appendChild(panel);

    const btnFlutuante = document.createElement("button");
    btnFlutuante.textContent = "🤖";
    btnFlutuante.style.cssText = `
        position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
        border-radius: 50%; border: none; background: #000; color: white;
        font-size: 28px; z-index: 9999998; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        border: 2px solid #4facfe; display: flex; align-items: center; justify-content: center;
    `;
    btnFlutuante.onclick = () => panel.classList.add("show");
    document.body.appendChild(btnFlutuante);
    document.getElementById("km-close").onclick = () => panel.classList.remove("show");

    // ==========================================
    // 2. MOTOR DE VARREDURA (DOM SCRAPER)
    // ==========================================
    const escanearPagina = () => {
        let textoCompleto = document.body.innerText || "";
        
        // Extrair textos escondidos dentro de fórmulas matemáticas (KaTeX)
        document.querySelectorAll('.katex-mathml annotation').forEach(el => {
            textoCompleto += " " + el.textContent;
        });

        // Extrair atributos ALT de imagens (muitas vezes contém dados vitais da questão)
        let dadosImagens = [];
        document.querySelectorAll('img').forEach(img => {
            if (img.alt) dadosImagens.push(img.alt);
        });

        const url = window.location.href;

        // Normalização agressiva (remove espaços duplos e quebras)
        const textoNormalizado = (textoCompleto + " " + dadosImagens.join(" ")).replace(/\s+/g, ' ').toLowerCase();

        return { texto: textoNormalizado, url: url, imagens: dadosImagens };
    };

    const parseVal = (regex, texto) => {
        const match = texto.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : null;
    };

    // ==========================================
    // 3. BANCO DE DADOS DE RESOLUÇÕES (VERSATILIDADE)
    // ==========================================
    // Aqui você adiciona novas lógicas para tipos diferentes de questões.
    const Solucionadores = [
        {
            nome: "Sistema: Pacotes de Viagem (Econômico, Conforto, Luxo)",
            // Condição para ativar esta lógica (se estas palavras estiverem na tela)
            identificar: (dados) => dados.texto.includes("pacote econômico") && dados.texto.includes("luxo"),
            resolver: (dados) => {
                const txt = dados.texto;
                const pEco = parseVal(/econ[ôo]mico.*?r\$\s*([\d\.,]+)/, txt);
                const pConf = parseVal(/conforto.*?r\$\s*([\d\.,]+)/, txt);
                const pLuxo = parseVal(/luxo.*?r\$\s*([\d\.,]+)/, txt);
                const totalArrecadado = parseVal(/arrecadad[oa]s?.*?r\$\s*([\d\.,]+)/, txt);
                
                const matchPacotes = txt.match(/vendidos.*?(\d+).*?pacotes/) || txt.match(/(\d+)\s+pacotes/);
                const pacotes = matchPacotes ? parseInt(matchPacotes[1]) : null;

                if (!pEco || !pConf || !pLuxo || !pacotes || !totalArrecadado) {
                    return { sucesso: false, erro: "Valores incompletos para esta fórmula." };
                }

                const denominador = (2 * pConf) + pLuxo - (3 * pEco);
                const numerador = totalArrecadado - (pEco * pacotes);
                
                const L = Math.round(numerador / denominador);
                const C = Math.round(2 * L);
                const E = Math.round(pacotes - 3 * L);

                return {
                    sucesso: true,
                    resposta: `Foram vendidos <b>${C}</b> pacotes conforto.`,
                    detalhes: `E=${E}, C=${C}, L=${L} | Total Arrecadado: R$${totalArrecadado}`
                };
            }
        },
        {
            nome: "Teorema de Pitágoras Básico (Exemplo de Versatilidade)",
            identificar: (dados) => dados.texto.includes("hipotenusa") && dados.texto.includes("cateto"),
            resolver: (dados) => {
                // Regex genérico para pegar números próximos à palavra cateto
                const catetos = [...dados.texto.matchAll(/cateto.*?(\d+)/g)].map(m => parseFloat(m[1]));
                if (catetos.length >= 2) {
                    const hipotenusa = Math.sqrt((catetos[0]**2) + (catetos[1]**2));
                    return { sucesso: true, resposta: `A hipotenusa é <b>${hipotenusa.toFixed(2)}</b>`, detalhes: `Catetos: ${catetos[0]} e ${catetos[1]}` };
                }
                return { sucesso: false, erro: "Não localizei os dois catetos." };
            }
        }
        // ADICIONE NOVOS BLOCOS AQUI conforme encontra novos tipos de questões
    ];

    // ==========================================
    // 4. CONTROLADOR PRINCIPAL
    // ==========================================
    document.getElementById("km-analyze").onclick = () => {
        const resultDiv = document.getElementById("km-result");
        const logContainer = document.getElementById("km-log-container");
        const logDiv = document.getElementById("km-log");
        
        logContainer.style.display = "block";
        resultDiv.style.display = "none";
        logDiv.innerHTML = "Escanando URL, Imagens e Elementos Ocultos...\n";

        setTimeout(() => {
            const dadosPagina = escanearPagina();
            logDiv.innerHTML += `URL: ${dadosPagina.url.substring(0, 40)}...\n`;
            logDiv.innerHTML += `Caracteres lidos: ${dadosPagina.texto.length}\n`;
            logDiv.innerHTML += `Imagens lidas: ${dadosPagina.imagens.length}\n`;
            
            let questaoIdentificada = false;

            // Testa a página contra todos os solucionadores cadastrados
            for (let solucionador of Solucionadores) {
                if (solucionador.identificar(dadosPagina)) {
                    questaoIdentificada = true;
                    logDiv.innerHTML += `\n>> Padrão Detectado: [${solucionador.nome}]`;
                    
                    const resultado = solucionador.resolver(dadosPagina);
                    
                    resultDiv.style.display = "block";
                    if (resultado.sucesso) {
                        resultDiv.style.borderLeft = "4px solid #00ff00";
                        resultDiv.innerHTML = `
                            <strong>✅ Questão Resolvida!</strong><br><br>
                            🧠 <b>Lógica:</b> ${solucionador.nome}<br>
                            📊 <b>Extraído:</b> ${resultado.detalhes}<br><br>
                            🎯 <b>Resposta:</b><br><span style="font-size:18px;">${resultado.resposta}</span>
                        `;
                    } else {
                        resultDiv.style.borderLeft = "4px solid #ff9800";
                        resultDiv.innerHTML = `⚠️ Padrão reconhecido, mas falhou na extração: ${resultado.erro}`;
                    }
                    break; // Para no primeiro padrão encontrado
                }
            }

            if (!questaoIdentificada) {
                resultDiv.style.display = "block";
                resultDiv.style.borderLeft = "4px solid #ff3333";
                resultDiv.innerHTML = `❌ <b>Nenhum padrão conhecido encontrado.</b><br>O script leu a página, mas não sabe qual fórmula aplicar para este texto. Adicione esta questão ao banco de dados interno do script.`;
            }
        }, 800);
    };

})();
