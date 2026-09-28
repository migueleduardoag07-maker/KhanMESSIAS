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
 width:260px;
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
}
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
Obter questões
</button>

`;

document.querySelector("#questao").onclick=()=>{


const texto=document.body.innerText;


alert(
"Questão encontrada:\n\n"+
texto.slice(0,500)
);


};


}else{

btn.textContent="Analisar página 100% OFF";

document.querySelector("#extra").innerHTML="";

}

};


})();
