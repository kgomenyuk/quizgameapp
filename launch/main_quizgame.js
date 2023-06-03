const { AppGameQuiz } = require("../apps/appGameQuiz");


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