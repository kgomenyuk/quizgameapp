const { Timestamp } = require("mongodb");
var m = require("mongoose");


const mAppQuizGame = require("./model_appQuizGame");
const mAllAppSettings = require("./model_allAppSettings");
const mAppCourses = require("./model_appCourses");
/**
 * registered TG bots
 */
const CBot = new m.Schema({
    botCode:String,
    apiKey:String,
    name:String,
    isOnline: Boolean,
    isDevMode: Boolean,
    ftpServer: String,
    ftpDir: String,
    ftpPwd: String,
    ftpUser: String,
    ftpPort: String,
    groups:[{
        id: String,
        userAdded: String,
        userAddedU:String,
        groupTitle: String,
        timestamp: Date
    }]
});

/**
 * user profile data
 */
const CProfile = new m.Schema({
    id: String, 
    fName: String,
    login: String,
    fullName: String,
    userRoles: [String],
    sName: String,
    lang: String,
    timeZone: Number,
    email: String
});

const MBot = m.model("bot", CBot);

const MProfile = m.model("profile", CProfile);



module.exports = {
    ...mAppQuizGame,
    ...mAllAppSettings,
    ...mAppCourses,
    MBot,
    MProfile
};