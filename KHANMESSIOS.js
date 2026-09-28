(() => {
    "use strict";

    // 1. Prevenir duplicação
    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo. Feche a página ou recarregue para reiniciar.");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // 2. Injetar Estilos Modernos
    const style = document.createElement("style");
    style.textContent = `
        #km-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9);
            width: 90%; max-width: 380px; background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px;
            padding: 25px; color: #fff; font-family: -apple-system, sans-serif;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6); z-index: 9999999;
            display: none; flex-direction: column; gap: 15px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0;
        }
        #km-panel.show { display: flex; opacity: 1; transform: translate(-50%, -50%) scale(1); }
        #km-title { font-size: 18px; font-weight: 700; text-align: center; color: #a777e3; margin-bottom: 5px; }
        .km-btn {
            width: 100%; padding: 14px; border: none; border-radius: 12px;
            background: linear-gradient(135deg, #6e8efb, #a777e3); color: white;
            font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.2s;
        }
        .km-btn:active { transform: scale(0.97); }
        .km-btn-secondary { background: #333; border: 1px solid #555; margin-top: 10px; }
        #km-result {
            background: rgba(0, 0, 0, 0.4); border-radius: 12px; padding: 15px;
            font-size: 14px; line-height: 1.6; display: none; border-left: 4px solid #a777e3;
        }
        #km-result strong { color: #a777e3; font-size: 16px;}
        #km-close {
            position: absolute; top: 15px; right: 15px; background: none; border: none;
            color: #888; font-size: 24px; cursor: pointer;
        }
        .km-loading { display: none; text-align: center; font-size: 14px; color: #aaa; }
        
        /* Estilos para o formulário manual */
        .km-input-group { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
        .km-input-group label { font-size: 12px; color: #ccc; }
        .km-input-group input {
            width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #444;
            background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; box-sizing: border-box;
        }
    `;
    document.head.appendChild(style);

    // 3. Criar Painel HTML
    const panel = document.createElement("div");
    panel.id = "km-panel";
    panel.innerHTML = `
        <button id="km-close">×</button>
        <div id="km-title">🍷 KhanMESSIAS</div>
        <button class="km-btn" id="km-analyze">Analisar e Resolver</button>
        <div class="km-loading" id="km-loading">Escaneando o DOM...</div>
        <div id="km-result"></div>
    `;
    document.body.appendChild(panel);

    // 4. Botão Flutuante
    const btnFlutuante = document.createElement("button");
    btnFlutuante.textContent = "🍷";
    btnFlutuante.style.cssText = `
        position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
        border-radius: 50%; border: none; background: #171717; color: white;
        font-size: 28px; z-index: 9999998; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
    `;
    btnFlutuante.onclick = () => panel.classList.add("show");
    document.body.appendChild(btnFlutuante);

    document.getElementById("km-close").onclick = () => panel.classList.remove("show");

    // Lógica Matemática Principal
    const executarCalculo = (pEco, pConf, pLuxo, pacotes, arrecadado) => {
        const resultDiv = document.getElementById("km-result");
        
        // Regra de negócio assumida: Conforto (C) = 2 * Luxo (L)
        const denominador = (2 * pConf) + pLuxo - (3 * pEco);
        const numerador = arrecadado - (pEco * pacotes);
        
        let L = Math.round(numerador / denominador);
        let C = Math.round(2 * L);
        let E = Math.round(pacotes - 3 * L);

        resultDiv.innerHTML = `
            <strong>✅ Resolvido!</strong><br><br>
            🧮 <b>Cálculo Extraído:</b><br>
            Econômico: R$${pEco} (${E} un.)<br>
            Conforto: R$${pConf} (${C} un.)<br>
            Luxo: R$${pLuxo} (${L} un.)<br><br>
            🎯 <b>Resposta:</b> Foram vendidos <b>${C}</b> pacotes conforto.
        `;
        resultDiv.style.display = "block";
    };

    // 5. Lógica de Extração
    document.getElementById("km-analyze").onclick = () => {
        const resultDiv = document.getElementById("km-result");
        const loadingDiv = document.getElementById("km-loading");
        const btnAnalyze = document.getElementById("km-analyze");
        
        resultDiv.style.display = "none";
        loadingDiv.style.display = "block";
        btnAnalyze.style.display = "none";

        setTimeout(() => {
            const rawText = document.body.innerText || "";
            const texto = rawText.replace(/\s+/g, ' ');

            // Regex muito mais flexível (o .*? ignora span e sujeiras do DOM entre a palavra e o valor)
            const parseVal = (regex) => {
                const match = texto.match(regex);
                return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : null;
            };

            let precoEco = parseVal(/econ[ôo]mico.*?R\$\s*([\d\.,]+)/i);
            let precoConf = parseVal(/conforto.*?R\$\s*([\d\.,]+)/i);
            let precoLuxo = parseVal(/luxo.*?R\$\s*([\d\.,]+)/i);
            let totalArrecadado = parseVal(/arrecadad[oa]s?.*?R\$\s*([\d\.,]+)/i);
            
            const matchPacotes = texto.match(/vendidos.*?(\d+).*?pacotes/i) || texto.match(/(\d+)\s+pacotes/i);
            let totalPacotes = matchPacotes ? parseInt(matchPacotes[1]) : null;

            loadingDiv.style.display = "none";

            // Se encontrou tudo, resolve direto
            if (precoEco && precoConf && precoLuxo && totalPacotes && totalArrecadado) {
                executarCalculo(precoEco, precoConf, precoLuxo, totalPacotes, totalArrecadado);
                btnAnalyze.style.display = "block";
                btnAnalyze.textContent = "Analisar Novamente";
            } else {
                // Se falhou, injeta formulário moderno sem usar `prompt()`
                resultDiv.style.display = "block";
                resultDiv.style.borderLeft = "4px solid #ff9800";
                resultDiv.innerHTML = `
                    <div style="color: #ff9800; font-weight: bold; margin-bottom: 10px;">⚠️ Extração falhou. Insira os dados:</div>
                    <div class="km-input-group">
                        <input type="number" id="in-eco" placeholder="Preço Econômico (ex: 800)" value="${precoEco || ''}">
                        <input type="number" id="in-conf" placeholder="Preço Conforto (ex: 1200)" value="${precoConf || ''}">
                        <input type="number" id="in-luxo" placeholder="Preço Luxo (ex: 2000)" value="${precoLuxo || ''}">
                        <input type="number" id="in-pacotes" placeholder="Total de Pacotes (ex: 60)" value="${totalPacotes || ''}">
                        <input type="number" id="in-arrecadado" placeholder="Total Arrecadado (ex: 72000)" value="${totalArrecadado || ''}">
                        <button class="km-btn km-btn-secondary" id="km-manual-calc">Calcular Manualmente</button>
                    </div>
                `;

                document.getElementById("km-manual-calc").onclick = () => {
                    const e = parseFloat(document.getElementById("in-eco").value);
                    const c = parseFloat(document.getElementById("in-conf").value);
                    const l = parseFloat(document.getElementById("in-luxo").value);
                    const p = parseFloat(document.getElementById("in-pacotes").value);
                    const a = parseFloat(document.getElementById("in-arrecadado").value);

                    if(e && c && l && p && a) {
                        resultDiv.style.borderLeft = "4px solid #a777e3";
                        executarCalculo(e, c, l, p, a);
                        btnAnalyze.style.display = "block";
                        btnAnalyze.textContent = "Nova Análise";
                    } else {
                        alert("Preencha todos os campos corretamente.");
                    }
                };
            }
        }, 600);
    };
})();
