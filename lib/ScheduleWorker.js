const { parentPort, workerData } = require('worker_threads');

var in_progress = false;

parentPort.on('message',
    message => {
    	//parentPort.postMessage({ })
    	if(message == "continue"){
    		in_progress = false;
    	}
    }
    );


// отправить оповещение юзерам
async function notifyUsers(){
	try{
		if(in_progress === true){return;}
		
		in_progress = true;
		parentPort.postMessage({ command: "notify" });
	} catch(e){
		console.log(e.message);
	}
}

// старт выполнения планировщика
setInterval(notifyUsers, 30000 );