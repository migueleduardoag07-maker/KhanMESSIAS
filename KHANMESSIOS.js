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

    // Função central que conecta com a I.A (OpenAI)
    async function obterRespostaIA(textoDaPagina) {
        let apiKey = localStorage.getItem("km_api_key");
        if (!apiKey) {
            apiKey = prompt("Insira sua chave de API da OpenAI (ChatGPT) para buscar respostas:");
            if (!apiKey) return;
            localStorage.setItem("km_api_key", apiKey);
        }

        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando com I.A...";

        try {
            // Extrai também o texto matemático do KaTeX, essencial para o Khan Academy
            let textoMatematico = "";
            document.querySelectorAll('.katex-mathml annotation').forEach(el => {
                textoMatematico += " " + el.textContent;
            });
            
            const textoFinal = (textoDaPagina + "\n" + textoMatematico).slice(0, 3500); // Limite de leitura

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Você é um resolvedor de questões focado em ser direto. O usuário enviará o texto bagunçado de uma página web contendo uma questão. Encontre a questão, resolva internamente, e retorne APENAS A RESPOSTA FINAL. Não explique como chegou lá, não use textos introdutórios. Diga apenas a resposta ou a alternativa correta."
                        },
                        {
                            role: "user",
                            content: textoFinal
                        }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                if(response.status === 401) {
                    localStorage.removeItem("km_api_key");
                    throw new Error("Chave de API inválida. Tente novamente.");
                }
                throw new Error("Erro na API: " + response.status);
            }

            const data = await response.json();
            respostaDiv.innerHTML = "🎯 <b>Resposta:</b><br>" + data.choices[0].message.content;

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
                <button class="km-btn" id="questao" style="background:#4facfe; color:#000;">
                    Obter resposta com I.A
                </button>
                <button class="km-btn" id="limpar_api" style="background:#444; color:#fff; font-size:11px; padding:6px;">
                    Redefinir API Key
                </button>
            `;

            document.querySelector("#questao").onclick = () => {
                const texto = document.body.innerText;
                obterRespostaIA(texto);
            };

            document.querySelector("#limpar_api").onclick = () => {
                localStorage.removeItem("km_api_key");
                alert("Sua chave da OpenAI foi removida do navegador.");
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
