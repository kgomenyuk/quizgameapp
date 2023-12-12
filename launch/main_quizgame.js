const { AppGameQuiz } = require("../apps/appGameQuiz");
const { AppPointsSender } = require("../apps/appPointsSender");
const { AppSurveyFields } = require("../apps/appSurveyFields");
const { UIMessage } = require("../lib/UIScreen");

UIMessage.debug = true;

// all apps available
let mapping = [
{
    alias: "game2",
    newInstance: () => new AppGameQuiz()
},
{
alias: "sf",
newInstance: () => {
var app = new AppSurveyFields();
//app.startCommand = "me";
//app.filterGroupId = "2";
//app.availableSurveyCodes = ["studInfo"];
//app.refCode = "cloud";
return app;
}
},
{
alias: "grcloud",
newInstance: () => {
var app = new AppPointsSender();
app.refCode = "cloud";
return app;
}
}];
    

module.exports = {
    name:"Game2 config",
    description: "Quiz game",
    mapping: mapping
};