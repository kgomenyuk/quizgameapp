/* 
launching configuration file
*/


const lv_start_name = process.env["LAUNCHER_NAME"];

if(!lv_start_name){
    throw "15001", "Launcher was not specified";
}

module.exports = require("../launch/"+lv_start_name);