var m = require("mongoose");

const CAnswer = new m.Schema(
    {
        pollId: String,
        userId: Number,
        anserId: Number,
        chatId: Number,
        isCorrect: Number,
    }
);
CAnswer.index({pollId: "1"}, {unique: true});
const MAnswer = m.model("poll_answer", CAnswer);


const CPoll = new m.Schema(
    {
        pollId: String,
        pollData: String,
        pollOwner: Number,
        pollMessageId: Number,
    }
);
CPoll.index({pollId: "1"}, {unique: true});
// a single question
const MPoll = m.model("poll", CPoll);

module.exports = {
    MPoll,
    MAnswer
};