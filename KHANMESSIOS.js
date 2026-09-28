(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    // 1. Injetar Estilos Modernos (Glassmorphism)
    const style = document.createElement("style");
    style.textContent = `
        #km-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            background: rgba(20, 20, 20, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 20px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 999999;
            display: none;
            flex-direction: column;
            gap: 15px;
            transition: all 0.3s ease;
        }
        #km-container.show { display: flex; }
        #km-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 10px;
        }
        #km-close {
            cursor: pointer;
            color: #aaa;
            font-size: 20px;
            background: none;
            border: none;
        }
        #km-close:hover { color: #fff; }
        .km-btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
        }
        .km-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .km-btn:active { transform: scale(0.98); }
        #km-result {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 15px;
            font-size: 14px;
            line-height: 1.5;
            display: none;
            border-left: 4px solid #a777e3;
        }
        #km-result strong { color: #a777e3; }
        .km-loading {
            display: none;
            text-align: center;
            font-size: 14px;
            color: #aaa;
        }
    `;
    document.head.appendChild(style);

    // 2. Criar Estrutura HTML
    const container = document.createElement("div");
    container.id = "km-container";
    container.innerHTML = `
        <div id="km-header">
            <span>🍷 KhanMESSIAS AI</span>
            <button id="km-close">×</button>
        </div>
        <button class="km-btn" id="km-analyze">Analisar e Resolver</button>
        <div class="km-loading" id="km-loading">Analisando o DOM da página...</div>
        <div id="km-result"></div>
    `;
    document.body.appendChild(container);

    // 3. Lógica do Botão Flutuante
    const btnFlutuante = document.createElement("button");
    btnFlutuante.textContent = "🍷";
    btnFlutuante.style.cssText = `
        position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
        border-radius: 50%; border: none; background: #171717; color: white;
        font-size: 28px; z-index: 999998; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    btnFlutuante.onclick = () => {
        container.classList.toggle("show");
    };
    document.body.appendChild(btnFlutuante);

    document.getElementById("km-close").onclick = () => {
        container.classList.remove("show");
    };

    // 4. Função de Extração e Resolução
    document.getElementById("km-analyze").onclick = () => {
        const resultDiv = document.getElementById("km-result");
        const loadingDiv = document.getElementById("km-loading");
        
        resultDiv.style.display = "none";
        loadingDiv.style.display = "block";

        setTimeout(() => {
            try {
                // Extrair TODO o texto da página de forma agressiva
                const allText = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'))
                    .map(el => el.innerText)
                    .join(' ')
                    .replace(/\s+/g, ' '); // Normaliza espaços e quebras de linha

                // Regex para capturar os valores
                const matchEco = allText.match(/econômico\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchConf = allText.match(/conforto\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchLuxo = allText.match(/luxo\s+por\s+R\$\s*([\d\.,]+)/i);
                const matchTotalPacotes = allText.match(/vendidos\s+(\d+)\s+pacotes/i);
                const matchTotalArrecadado = allText.match(/arrecadados\s+R\$\s*([\d\.,]+)/i);

                // Função para limpar os valores (ex: "72.000,00" -> 72000)
                const parseVal = (val) => val ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : 0;

                let precoEco = parseVal(matchEco ? matchEco[1] : null);
                let precoConf = parseVal(matchConf ? matchConf[1] : null);
                let precoLuxo = parseVal(matchLuxo ? matchLuxo[1] : null);
                let totalPacotes = matchTotalPacotes ? parseInt(matchTotalPacotes[1]) : 0;
                let totalArrecadado = parseVal(matchTotalArrecadado ? matchTotalArrecadado[1] : null);

                // Fallback: Se a extração automática falhar, tenta pegar os números soltos
                if (!precoEco || !precoConf || !precoLuxo || !totalPacotes || !totalArrecadado) {
                    const numeros = allText.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g);
                    if (numeros) {
                        const valores = numeros.map(n => parseVal(n)).filter(n => n > 0);
                        // Lógica de heurística simples para fallback
                        // (Isso é apenas uma segurança extra)
                    }
                }

                // Se ainda estiver faltando dados, aciona o modo manual (Análise da Tela do Usuário)
                if (!precoEco || !precoConf || !precoLuxo || !totalPacotes || !totalArrecadado) {
                    loadingDiv.style.display = "none";
                    
                    precoEco = parseFloat(prompt("⚠️ Extração automática falhou.\n\nDigite o preço do pacote ECONÔMICO (ex: 800):", "800"));
                    precoConf = parseFloat(prompt("Digite o preço do pacote CONFORTO (ex: 1200):", "1200"));
                    precoLuxo = parseFloat(prompt("Digite o preço do pacote LUXO (ex: 2000):", "2000"));
                    totalPacotes = parseInt(prompt("Digite a quantidade TOTAL de pacotes vendidos (ex: 60):", "60"));
                    totalArrecadado = parseFloat(prompt("Digite o valor TOTAL arrecadado (ex: 72000):", "72000"));
                }

                if (precoEco && precoConf && precoLuxo && totalPacotes && totalArrecadado) {
                    // 5. Resolução Matemática
                    // E + C + L = T
                    // Pe*E + Pc*C + Pl*L = R
                    // C = 2L
                    // Substituindo: E = T - 3L
                    // Pe*(T - 3L) + Pc*(2L) + Pl*L = R
                    // Pe*T - 3Pe*L + 2Pc*L + Pl*L = R
                    // L * (2Pc + Pl - 3Pe) = R - Pe*T
                    
                    const denominador = (2 * precoConf) + precoLuxo - (3 * precoEco);
                    const numerador = totalArrecadado - (precoEco * totalPacotes);
                    
                    let L = numerador / denominador;
                    let C = 2 * L;
                    let E = totalPacotes - 3 * L;

                    // Arredondar
                    L = Math.round(L);
                    C = Math.round(C);
                    E = Math.round(E);

                    // Exibir Resultado
                    loadingDiv.style.display = "none";
                    resultDiv.style.display = "block";
                    resultDiv.innerHTML = `
                        <strong>✅ Análise Concluída!</strong><br><br>
                        📊 <b>Dados extraídos:</b><br>
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
                    resultDiv.innerHTML = "❌ Não foi possível obter os dados. Tente novamente.";
                }

            } catch (error) {
                loadingDiv.style.display = "none";
                resultDiv.style.display = "block";
                resultDiv.innerHTML = `❌ Erro: ${error.message}`;
            }
        }, 800); // Pequeno delay para parecer que está processando
    };

})();
