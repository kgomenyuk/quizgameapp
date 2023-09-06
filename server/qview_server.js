var http = require('http');
const { Server } = require('socket.io');
const { AppCore } = require('../lib/AppBase');

var clients = [];
/** WS server
 * @type {Server}
 */
var io = null;

/**
 * 
 * @param {*} server 
 * @param { AppCore } apps 
 */
function start(server, apps){
    io = new Server(server);

    io.on('connection', (socket) => {
        console.log(`Client with id ${socket.id} connected`);
        clients.push(socket.id);

        

        socket.emit('message', "I'm server");

        socket.on('message', (message) =>
            console.log('Message: ', message)
        );

        socket.on('connecttogame', (message) =>{
            // client will send instance ID
            // tell the game about a new client

            // join a special room
            var instanceId = message;
            if(instanceId!=null && instanceId!=""){
                socket.join("G2" + instanceId);
            }else{
                socket.disconnect(true);
            }

            console.log('Message: ', message)
            
        });

        socket.on('disconnect', () => {
            clients.splice(clients.indexOf(socket.id), 1);
            console.log(
                `Client with id ${socket.id} disconnected`
            );
        });

        /**
         * Send event to app-related clients
         * @param {string} app 
         * @param {string} ev 
         * @param {any} evdata 
         */

    });

    apps.setEmitFx(async (app, ev, evdata) => {
        io.to(app).emit(ev, evdata);
    });
}


module.exports = start;