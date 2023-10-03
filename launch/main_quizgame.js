const { AppCourses } = require("../apps/appCourses");
const { AppGameQuiz } = require("../apps/appGameQuiz");
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
    alias: "course",
    newInstance: () => new AppCourses()
}];

module.exports = {
    name:"Game2 config",
    description: "Quiz game",
    mapping: mapping
};