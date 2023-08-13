// writing sample ettings for appQuizGame
const { getDb, startDb } = require("./db");
const { MAppSettings } = require("./model");

require("dotenv").config({path:"./.env" });
require("dotenv").config({path:"./launch/.env" });


// add bot settings to the db
async function writeDataBotSettings(){
    await startDb();
    var c = getDb();
    var r = await MAppSettings.bulkWrite([
        { updateOne:{
            filter:{ 
                appAlias: "game2"
            },
            upsert:true,
            update: {
                settings:[
                    {
                        propertyName:'webhost',
                        propertyValue: process.env["APP_GAMEQUIZ_HOST"]
                    }
                ]
            }
        }}
    ]);
}

function main(){
    writeDataBotSettings().then();
}


main();