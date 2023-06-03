const { mongoose } = require("mongoose");
const { MBot, MProfile } = require("./model");
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

/**
 * 
 * @param {String} botCode 
 * @returns { botCode:String, apiKey:String,name:String,isOnline: Boolean,   isDevMode: Boolean,    ftpServer: String,    ftpDir: String,ftpPwd: String,ftpUser: String,ftpPort: String }
 */
async function getBot(botCode)  {

   const botDb = await MBot.findOne({ botCode: botCode }, { _id: 0 } );

   if(botDb){
        const bot = botDb.toObject();
        return bot;
    }
    return null;
};

async function getProfile(userId){
    var d_u
        = await MProfile.findOne({
            id: userId
        });
    return d_u;
};

async function getStaff(){
    var arr_d_u
        = await MProfile.find({
            userRoles: "staff"
        });
    return arr_d_u;
};

async function ensureUser({id, fname, sname, login, role, lang}) {

    const c = await MProfile.findOne({ id: id + "" }, {_id:0});

    if(c == null){
        // user not found in the database
        await MProfile.create({
            id: id, 
                fName:fname,
                login:login,
                fullName: (fname?"":fname + " ") + (sname?"":sname),
                userRole:role,
                sName:sname,
                lang: lang,
                createdDTTM: new Date(),
                timZone: 0
        });

        return {id, fname, sname, login, role, lang};
    }else{
        return c.toObject();
    }
};

module.exports={
    startDb,
    getDb,
    disconnectDb,
    getBot,
    getProfile,
    ensureUser,
    getStaff
}