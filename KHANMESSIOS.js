(() => {
    "use strict";

    // 1. Prevenir duplicação
    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo. Feche a página ou recarregue para reiniciar.");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // 2. Injetar Estilos Modernos (Glassmorphism)
    const style = document.createElement("style");
    style.textContent = `
        #km-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 90%;
            max-width: 380px;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 25px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
            z-index: 9999999;
            display: none;
            flex-direction: column;
            gap: 15px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            opacity: 0;
        }
        #km-panel.show {
            display: flex;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        #km-title {
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            color: #a777e3;
            margin-bottom: 5px;
        }
        .km-btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(110, 142, 251, 0.3);
        }
        .km-btn:active { transform: scale(0.97); }
        #km-result {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            padding: 15px;
            font-size: 14px;
            line-height: 1.6;
            display: none;
            border-left: 4px solid #a777e3;
            word-wrap: break-word;
        }
        #km-result strong { color: #a777e3; }
        #km-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
        }
        #km-close:hover { color: #fff; }
        .km-loading {
            display: none;
            text-align: center;
            font-size: 14px;
            color: #aaa;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(style);

    // 3. Criar Painel HTML
    const panel = document.createElement("div");
    panel.id = "km-panel";
    panel.innerHTML = `
        <button id="km-close">×</button>
        <div id="km-title">🍷 KhanMESSIAS Resolver</div>
        <button class="km-btn" id="km-analyze">Analisar Página e Resolver</button>
        <div class="km-loading" id="km-loading">Escaneando o DOM da página...</div>
        <div id="km-result"></div>
    `;
    document.body.appendChild(panel);

    // 4. Botão Flutuante para abrir o Painel
    const btnFlutuante = document.createElement("button");
    btnFlutuante.textContent = "🍷";
    btnFlutuante.style.cssText = `
        position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
        border-radius: 50%; border: none; background: #171717; color: white;
        font-size: 28px; z-index: 9999998; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
    `;
    btnFlutuante.onclick = () => {
        panel.classList.add("show");
    };
    document.body.appendChild(btnFlutuante);

    document.getElementById("km-close").onclick = () => {
        panel.classList.remove("show");
    };

    // 5. Lógica de Extração e Resolução
    document.getElementById("km-analyze").onclick = () => {
        const resultDiv = document.getElementById("km-result");
        const loadingDiv = document.getElementById("km-loading");
        
        resultDiv.style.display = "none";
        loadingDiv.style.display = "block";

        setTimeout(() => {
            try {
                // Extração Agressiva: Pega todo o texto visível da página e normaliza
                const rawText = document.body.innerText || "";
                const texto = rawText.replace(/\s+/g, ' '); // Remove quebras de linha e espaços duplos

                // Regex flexíveis para capturar os valores (aceita R$ 800,00 ou R$800,00)
                const matchEco = texto.match(/econômico\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchConf = texto.match(/conforto\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchLuxo = texto.match(/luxo\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchTotalPacotes = texto.match(/vendidos\s+(\d+)\s+pacotes/i);
                const matchTotalArrecadado = texto.match(/arrecadados\s+R\$\s*([\d\.,]+)/i);

                // Função para limpar os valores (ex: "72.000,00" -> 72000)
                const parseVal = (val) => val ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : 0;

                let precoEco = parseVal(matchEco ? matchEco[1] : null);
                let precoConf = parseVal(matchConf ? matchConf[1] : null);
                let precoLuxo = parseVal(matchLuxo ? matchLuxo[1] : null);
                let totalPacotes = matchTotalPacotes ? parseInt(matchTotalPacotes[1]) : 0;
                let totalArrecadado = parseVal(matchTotalArrecadado ? matchTotalArrecadado[1] : null);

                // Se a extração automática falhar, aciona o Modo Manual (Análise da Tela)
                if (!precoEco || !precoConf || !precoLuxo || !totalPacotes || !totalArrecadado) {
                    loadingDiv.style.display = "none";
                    
                    // Tenta pegar valores padrão baseados no problema
                    const defaultEco = precoEco || 800;
                    const defaultConf = precoConf || 1200;
                    const defaultLuxo = precoLuxo || 2000;
                    const defaultPacotes = totalPacotes || 60;
                    const defaultArrecadado = totalArrecadado || 72000;

                    precoEco = parseFloat(prompt("⚠️ Extração automática falhou.\n\nDigite o preço do pacote ECONÔMICO:", defaultEco));
                    precoConf = parseFloat(prompt("Digite o preço do pacote CONFORTO:", defaultConf));
                    precoLuxo = parseFloat(prompt("Digite o preço do pacote LUXO:", defaultLuxo));
                    totalPacotes = parseInt(prompt("Digite a quantidade TOTAL de pacotes vendidos:", defaultPacotes));
                    totalArrecadado = parseFloat(prompt("Digite o valor TOTAL arrecadado:", defaultArrecadado));
                }

                if (precoEco && precoConf && precoLuxo && totalPacotes && totalArrecadado) {
                    // 6. Resolução Matemática
                    // E + C + L = T  =>  E = T - 3L (já que C = 2L)
                    // Pe*E + Pc*C + Pl*L = R
                    // Pe*(T - 3L) + Pc*(2L) + Pl*L = R
                    // Pe*T - 3Pe*L + 2Pc*L + Pl*L = R
                    // L * (2Pc + Pl - 3Pe) = R - Pe*T
                    
                    const denominador = (2 * precoConf) + precoLuxo - (3 * precoEco);
                    const numerador = totalArrecadado - (precoEco * totalPacotes);
                    
                    let L = numerador / denominador;
                    let C = 2 * L;
                    let E = totalPacotes - 3 * L;

                    // Arredondar para evitar problemas de ponto flutuante
                    L = Math.round(L);
                    C = Math.round(C);
                    E = Math.round(E);

                    // Exibir Resultado
                    loadingDiv.style.display = "none";
                    resultDiv.style.display = "block";
                    resultDiv.innerHTML = `
                        <strong>✅ Análise Concluída!</strong><br><br>
                        📊 <b>Dados Utilizados:</b><br>
                        Econômico: R$${precoEco.toFixed(2)}<br>
                        Conforto: R$${precoConf.toFixed(2)}<br>
                        Luxo: R$${precoLuxo.toFixed(2)}<br>
                        Total Pacotes: ${totalPacotes}<br>
                        Total Arrecadado: R$${totalArrecadado.toFixed(2)}<br><br>
                        🧮 <b>Cálculo:</b><br>
                        Econômico: ${E} un.<br>
                        Conforto: ${C} un.<br>
                        Luxo: ${L} un.<br><br>
                        🎯 <b>Resposta:</b> Foram vendidos <b>${C}</b> pacotes conforto.
                    `;
                } else {
                    loadingDiv.style.display = "none";
                    resultDiv.style.display = "block";
                    resultDiv.innerHTML = "❌ Dados inválidos. Tente novamente.";
                }

            } catch (error) {
                loadingDiv.style.display = "none";
                resultDiv.style.display = "block";
                resultDiv.innerHTML = `❌ Erro: ${error.message}`;
            }
        }, 500); // Delay para feedback visual
    };

})();
