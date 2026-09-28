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

    // Processador de IA sem necessidade de chave API
    async function obterRespostaSemKey(textoDaPagina) {
        const respostaDiv = document.querySelector("#km-resposta");
        respostaDiv.style.display = "block";
        respostaDiv.textContent = "⏳ Analisando sem chave API (IA Gratuita)...";

        try {
            // Extrai texto de fórmulas matemáticas (KaTeX)
            let textoMatematico = "";
            document.querySelectorAll('.katex-mathml annotation').forEach(el => {
                textoMatematico += " " + el.textContent;
            });

            const textoFinal = (textoDaPagina + "\n" + textoMatematico).slice(0, 3500);

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
                            content: "Você é um resolvedor de questões focado em ser extremamente direto. Encontre a questão no texto recebido e retorne APENAS A RESPOSTA FINAL (ex: a alternativa correta, número ou valor exato). Não explique nada, não dê saudações, forneça apenas a resposta."
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
                throw new Error("Erro na conexão com o servidor gratuito: " + response.status);
            }

            const resultadoTexto = await response.text();

            if (resultadoTexto) {
                respostaDiv.innerHTML = "🎯 <b>Resposta:</b><br>" + resultadoTexto.trim().replace(/\n/g, "<br>");
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
