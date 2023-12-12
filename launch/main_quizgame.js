const { AppCourses } = require("../apps/appCourses");
const { AppGameQuiz } = require("../apps/appGameQuiz");
const { AppPointsSender } = require("../apps/appPointsSender");
const { AppSurveyFields } = require("../apps/appSurveyFields");
const { AppPoll } = require("../apps/appPoll");
const { UIMessage } = require("../lib/UIScreen");

UIMessage.debug = true;

// all apps available
let mapping = [
{
    alias: "game2",
    newInstance: () => new AppGameQuiz()
},
{
    alias: "course",
    newInstance: () => new AppCourses()
},
{
    alias: "poll",
    newInstance: () => {
        var app = new AppPoll();
        return app;
    }
},
];

module.exports = {
    name:"Game2 config",
    description: "Quiz game",
    mapping: mapping
};