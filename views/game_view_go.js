//var s = require("socket.io");
//var io = new s.Socket();
let socket = io();

setTimeout(()=>{
    
    socket.emit('connecttogame', instance);
    
}, 3000);



// 1: round changed
socket.on("round", (x)=>{
    //data: 
    var round = {
        number: 0,
        title: "Round title",
        questionsCount: 4,
        state: "info" // info, started, finished
    };

    round = {
        number: x.number,
        title: x.title,
        questionsCount: x.questionsCount,
        state: x.state // info, started, finished
    };

    if(round.title!=null){
        var h = document.getElementById("round_header");
        h.innerText = "Round " + round.number + ". " + round.title;

        var d = document.getElementById("round_details");
        d.innerText = round.title;

        var qn = document.getElementById("round_q_number");
        qn.innerText = "Number of questions: " + round.questionsCount;
    }


});

// 2: question changed
socket.on("question", (x)=>{
    //data: 
    var question = {
        number: 0,
        text: "Some question",
        state: "info" // info, opened, closed, finished
    };

    if(round.title!=null){
        var h = document.getElementById("round_header");
        h.innerText = "Round " + round.number + ". " + round.title;

        var d = document.getElementById("round_details");
        d.innerText = round.title;
    }
});

// 3: game state changed
socket.on("game", (x)=>{

});

socket.on("activity", (x)=>{
    var spam_box = document.getElementById("spam_chat");
    
    var nd = document.createElement("div");
    nd.innerHTML = x.action + ": " + x.username + " of " + x.ance;

    spam_box.appendChild(nd);
});