(()=>{
"use strict";

if(window.KHANMESSIAS_RUNNING){
    alert("KhanMESSIAS já está ativo");
    return;
}

window.KHANMESSIAS_RUNNING=true;

const state={
    analyzing:false
};

const style=document.createElement("style");
style.textContent=`
#km-button{
 position:fixed;
 right:20px;
 bottom:20px;
 width:60px;
 height:60px;
 border-radius:50%;
 border:none;
 background:#171717;
 color:white;
 font-size:28px;
 z-index:999999;
 cursor:pointer;
}
#km-menu{
 position:fixed;
 right:20px;
 bottom:90px;
 width:280px;
 background:#222;
 color:white;
 padding:15px;
 border-radius:15px;
 display:none;
 z-index:999999;
 font-family:Arial;
}
.km-btn{
 width:100%;
 padding:10px;
 margin-top:10px;
 border:none;
 border-radius:8px;
 cursor:pointer;
 background:#444;
 color:white;
}
.km-btn:hover { background:#555; }
`;

document.head.appendChild(style);

const button=document.createElement("button");
button.id="km-button";
button.textContent="🍷";

const menu=document.createElement("div");
menu.id="km-menu";

menu.innerHTML=`
<h3>KhanMESSIAS</h3>
<button class="km-btn" id="analisar">
Analisar página 100% OFF
</button>
<div id="extra"></div>
`;

document.body.appendChild(button);
document.body.appendChild(menu);

button.onclick=()=>{
 menu.style.display=
 menu.style.display==="block"
 ?"none"
 :"block";
};

document.querySelector("#analisar").onclick=()=>{
state.analyzing=!state.analyzing;
const btn=document.querySelector("#analisar");

if(state.analyzing){
    btn.textContent="Analisar página 100% ON";
    document.querySelector("#extra").innerHTML=`
    <button class="km-btn" id="questao">
    Obter resposta
    </button>
    `;

    document.querySelector("#questao").onclick=()=>{
        const texto = document.body.innerText;

        // Extrair valores usando Regex
        let precoEco = 0, precoConf = 0, precoLuxo = 0;
        let totalPacotes = 0, totalArrecadado = 0;

        // Pega todos os valores em R$
        const matchesPrecos = texto.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g);
        if (matchesPrecos && matchesPrecos.length >= 3) {
            precoEco = parseFloat(matchesPrecos[0].replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            precoConf = parseFloat(matchesPrecos[1].replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            precoLuxo = parseFloat(matchesPrecos[2].replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
        }

        // Pega a quantidade total de pacotes
        const matchTotalPacotes = texto.match(/vendidos\s+(\d+)\s+pacotes/i);
        if (matchTotalPacotes) totalPacotes = parseInt(matchTotalPacotes[1]);

        // Pega o valor total arrecadado
        const matchTotalArrecadado = texto.match(/arrecadados\s+R\$\s*([\d\.,]+)/i);
        if (matchTotalArrecadado) {
            totalArrecadado = parseFloat(matchTotalArrecadado[1].replace(/\./g, '').replace(',', '.'));
        }

        // Verifica se conseguiu extrair os dados
        if (precoEco > 0 && precoConf > 0 && precoLuxo > 0 && totalPacotes > 0 && totalArrecadado > 0) {
            
            // Lógica Matemática:
            // E + C + L = totalPacotes
            // Eco*E + Conf*C + Luxo*L = totalArrecadado
            // C = 2L (O número de conforto é o dobro do luxo)

            // Substituindo C por 2L na primeira equação: E + 3L = totalPacotes => E = totalPacotes - 3L
            // Substituindo E e C na segunda equação:
            // Eco*(totalPacotes - 3L) + Conf*(2L) + Luxo*L = totalArrecadado
            // Eco*totalPacotes - 3*Eco*L + 2*Conf*L + Luxo*L = totalArrecadado
            // L * (-3*Eco + 2*Conf + Luxo) = totalArrecadado - Eco*totalPacotes
            // L = (totalArrecadado - Eco*totalPacotes) / (-3*Eco + 2*Conf + Luxo)

            let L = (totalArrecadado - precoEco * totalPacotes) / (-3 * precoEco + 2 * precoConf + precoLuxo);
            let C = 2 * L;
            let E = totalPacotes - 3 * L;

            // Arredondar para evitar problemas de ponto flutuante
            L = Math.round(L);
            C = Math.round(C);
            E = Math.round(E);

            alert(`✅ Análise Concluída!\n\n📊 Dados extraídos:\nEconômico: R$${precoEco}\nConforto: R$${precoConf}\nLuxo: R$${precoLuxo}\nTotal de pacotes: ${totalPacotes}\nTotal arrecadado: R$${totalArrecadado}\n\n🧮 Cálculo:\nEconômico: ${E} unidades\nConforto: ${C} unidades\nLuxo: ${L} unidades\n\n🎯 Resposta: A quantidade de pacotes conforto vendidos foi ${C}.`);

        } else {
            alert("⚠️ Não foi possível extrair todos os dados necessários. Verifique se a página está totalmente carregada.");
        }
    };

} else {
    btn.textContent="Analisar página 100% OFF";
    document.querySelector("#extra").innerHTML="";
}
};

})();
