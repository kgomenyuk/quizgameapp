const { AppGameQuiz } = require("../apps/appGameQuiz");
const { UIMessage } = require("../lib/UIScreen");

UIMessage.debug = true;

// all apps available
let mapping = [
{
	alias: "game2",
	newInstance: () => new AppGameQuiz()
}];

module.exports = {
    name:"Game2 config",
    description: "Quiz game",
    mapping: mapping
};