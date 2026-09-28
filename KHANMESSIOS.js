(() => {
    "use strict";

    if (window.KHANMESSIAS_RUNNING) {
        alert("KhanMESSIAS já está ativo");
        return;
    }
    window.KHANMESSIAS_RUNNING = true;

    const state = {
        analyzing: false
    };

    // Chave de API do Gemini configurada automaticamente
    const DEFAULT_API_KEY = "AQ.Ab8RN6JocWJTYdwgPxzd6SNEHXJQSL5_HRCZhTvQoah6yyZRPQ";
    if (!localStorage.getItem("km_gemini_api_key")) {
        localStorage.setItem("km_gemini_api_key", DEFAULT_API_KEY);
    }

    const style = document.createElement("style");
    style.textContent = `
        #km-button {
            position: fixed; right: 20px; bottom: 20px; width: 60px; height: 60px;
            border-radius: 50%; border: none; background: #171717; color: white;
            font-size: 28px; z-index: 999999; cursor: pointer;
        }
        #km-menu {
            position: fixed; right: 20px; bottom: 90px; width: 260px; background: #222;
            color: white; padding: 15px; border-radius: 15px; display: none;
            z-index: 999999; font-family: Arial;
        }
        .km-btn {
            width: 100%; padding: 10px; margin-top: 10px; border: none;
            border-radius: 8px; cursor: pointer; font-weight: bold;
        }
        #km-resposta {
            margin-top: 15px; padding: 10px; background: #333; border-radius: 8px;
            color: #00ff00; font-size: 14px; display: none; word-wrap: break-word;
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

    // Função de comunicação com a API do Google Gemini
    async function obterRespostaGemini(textoDaPagina) {
        let apiKey = localStorage.getItem("km_gemini_api_key") || DEFAULT_API_KEY;

        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando com Gemini I.A...";

        try {
            // Captura também expressões matemáticas (KaTeX)
            let textoMatematico = "";
            document.querySelectorAll('.katex-mathml annotation').forEach(el => {
                textoMatematico += " " + el.textContent;
            });
            
            const textoFinal = (textoDaPagina + "\n" + textoMatematico).slice(0, 4000);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: "Texto extraído da página:\n\n" + textoFinal }
                            ]
                        }
                    ],
                    systemInstruction: {
                        parts: [
                            {
                                text: "Você é um resolvedor de questões direto e preciso. Encontre a questão contida no texto recebido, resolva-a internamente e retorne APENAS A RESPOSTA FINAL (ex: a opção correta, o valor numérico ou a alternativa). Não explique os cálculos e não inclua saudações."
                            }
                        ]
                    },
                    generationConfig: {
                        temperature: 0.1
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || "Erro na API Gemini: " + response.status);
            }

            const data = await response.json();
            const textoResposta = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (textoResposta) {
                respostaDiv.innerHTML = "🎯 <b>Resposta:</b><br>" + textoResposta.trim().replace(/\n/g, "<br>");
            } else {
                throw new Error("Nenhuma resposta gerada pela I.A.");
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
                <button class="km-btn" id="questao" style="background:#a777e3; color:#fff;">
                    Obter resposta (Gemini IA)
                </button>
                <button class="km-btn" id="limpar_api" style="background:#444; color:#fff; font-size:11px; padding:6px;">
                    Alterar API Key
                </button>
            `;

            document.querySelector("#questao").onclick = () => {
                const texto = document.body.innerText;
                obterRespostaGemini(texto);
            };

            document.querySelector("#limpar_api").onclick = () => {
                const novaChave = prompt("Digite a API Key do Gemini:", localStorage.getItem("km_gemini_api_key") || "");
                if (novaChave) {
                    localStorage.setItem("km_gemini_api_key", novaChave);
                    alert("Chave atualizada!");
                }
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
