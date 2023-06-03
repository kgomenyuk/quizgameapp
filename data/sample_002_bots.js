const { getDb, startDb } = require("./db");
const { MBot } = require("./model");


// add bot settings to the db
async function writeDataBot(){
    await startDb();
    var c = getDb();
    var r = await MBot.bulkWrite([
        { updateOne:{
            filter:{ botCode: "sample"},
            upsert:true,
            update: {
                botCode: "sample", 
                name: "sample bot", 
                apiKey:"API", 
                isDevMode:true, 
                isOnline:false
            }
        }}
    ]);
}

module.exports={
    writeDataBot
}