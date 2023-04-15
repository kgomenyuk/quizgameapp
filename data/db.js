const { mongoose } = require("mongoose");
/**
 * @type {mongoose}
 */
var conn = null;
require("dotenv").config({path:"./.env" });


// try to connect to the database
async function startDb(){
    const c = await mongoose.connect(process.env["DB"]);

    conn = c;
}

async function disconnectDb(){
    await conn.disconnect();
}

function getDb(){
    return conn;
}


module.exports={
    startDb,
    getDb,
    disconnectDb
}