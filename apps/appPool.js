const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { asoCourses } = require("./asoCourses");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");
const mdb = require("../data/db");
const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage } = require("../lib/UIScreen");
const { MPoll, MAnswer } = require("../data/model_poll");
const { Int32 } = require("mongodb");
const { MBot, MProfile, MQuizPlan, MAppSettings, MGameInstance } = require("../data/model");

// App responsible for pool activity.
class AppPool extends AppBase {
    _init() {
		this.app = "poll";
        this.isPublicAllowed = true;
	}
	getState(){

	}

    _requireSharedData = (sman) => {

	}

    // initial session object
	_newSessionDataObject() {
		return {};
	}

	_checkBeforeRun(s, t) {
		return true;
	}


	// загрузить данные из БД
	async _loadData() {



		return true;
	}
	
	_getTriggers(){
		var createPoolTrigger = new TGCommandEventTrigger("createPoll", "createPoll", null);
		createPoolTrigger.handlerFunction = this.create_pool;	

        var finishPoolTrigger = new TGCommandEventTrigger("finishPoll", "finishPoll", null);
		finishPoolTrigger.handlerFunction = this.finish_poll;	

        var leaderboardTrigger = new TGCommandEventTrigger("lb", "lb", null);
		leaderboardTrigger.handlerFunction = this.leaderboard;

		return [
			createPoolTrigger,
            finishPoolTrigger,
            leaderboardTrigger
			];
	}

    async recievePollAnsewr(ctx){

        try{
            const pollId = ctx.update.poll_answer.poll_id;
            const poll = await MPoll.findOne({pollId: pollId}).exec();
            if(!poll)
            {
                console.log("Poll %d is missing",  ctx.update.poll_answer.poll_id);
                return;
            }
            const options = ctx.update.poll_answer.option_ids;
            if(options.length == 0){
                await MAnswer.deleteOne({pollId: pollId, userId: ctx.update.poll_answer.user.id});
            }
            else{
                let option = options[0];
                const pollData = JSON.parse(poll.pollData);
                let isCorrect = 0;
                if(pollData.isQuiz && pollData.correctOptionId == option){
                    isCorrect = 1;
                }
                await MAnswer.create({pollId: pollId, userId: ctx.update.poll_answer.user.id, answerId: option, chatId: pollData.chatId, isCorrect: isCorrect});
            }

            const user = ctx.update.poll_answer.user;
            await mdb.ensureUser({id: user.id, fname: user.first_name, sname: user.last_name, login: user.username, role: null, lang: user.language_code})
        }
        catch(e){
            console.log(e);
        }
    }

    async leaderboard(s, ctx, state){
        try{
            s.watchMessage();
            await ctx.deleteMessage(ctx.message.message_id);

            const chatId = ctx.chat.id;
            const answers = await MAnswer.find({chatId: chatId, isCorrect: 1});

            if(!answers || answers.length == 0)
            {
                return;
            }

            var user_correct_answers = answers.map(x => x.userId);
            const groups = {};
            user_correct_answers.forEach(x => groups[x] = (groups[x] || 0) + 1);

            var leaderBoard = [];

            for (const [key, value] of Object.entries(groups)) {
                leaderBoard.push({userId: key, score: value});
            }

            //const user = await MProfile.findOne({ id: id + "" }, {_id:0});
            leaderBoard.sort((a, b) => a.score < b.score ? 1 : -1);

            let result = 'Leaderboard:';
            for(let i=0; i< leaderBoard.length; i++){
                const user = await MProfile.findOne({id: leaderBoard[i].userId});
                if(!user)
                    continue;

                result+='\n\t';
                result+= (user.fName??'') + " " + (user.sName??'') + ': ' +  leaderBoard[i].score;
            }

            ctx.reply(result);
        }
        catch(e){
            console.log(e);
        }
    }

    async finish_poll(s, ctx, state){
        try{
            s.watchMessage();
            await ctx.deleteMessage(ctx.message.message_id);
            if(!ctx.update.message?.reply_to_message?.message_id)
                return;

            const poll = await MPoll.findOne({pollMessageId: ctx.update.message.reply_to_message.message_id}).exec();
            if(!poll)
                return;

            var pollId = poll.pollId;
            if(poll.pollOwner != ctx.from.id)
                return;

            const pollData = JSON.parse(poll.pollData); 

            await ctx.telegram.stopPoll(pollData.chatId, poll.pollMessageId);

        }
        catch(e){
            console.log(e);
        }
    }

    async create_pool(s, ctx, state){

        const helpMessage = "Greate poll with command: /createpool {question}?{anser1};{answer2};...;{anser N}\n To mark correct answer add '*' in the begginning of the answer."
        try{
            s.watchMessage();
            const cmdLength = ctx.message.entities[0].length;
            const text = ctx.message.text.substr(cmdLength + 1);
            if(text == 'help'){
                ctx.reply(helpMessage);
                return;
            }

            await ctx.deleteMessage(ctx.message.message_id);

            const arrPoll =  text.split("?");
            const arrOptions = arrPoll[1].trim(";").trim(" ").split(";").filter(x => x.length > 0);
            const namePoll = arrPoll[0];
            const chatId = ctx.chat.id;
            const objPoll = {
                chatId: chatId,
                options: arrOptions,
                name: namePoll,
                isMultiple: false,
                isQuiz: false,
                explanation:""
            };
            // add a correct option
            var correctOptionId = 0;
            objPoll.options 
                = objPoll.options.map((x, i)=>{
                    var p = { };
                    if(x.startsWith("*")){
                        p.text = x.substring(1);
                        p.isCorrect = true;
                        correctOptionId = i;
                        // пояснение
                        if(p.text.indexOf("|")>0){
                            var arExp = p.text.split("|");
                            objPoll.explanation=arExp[0];
                            p.text = arExp[1];
                        }
                    }else{
                        p.text = x;
                        p.isCorrect = false;
                    }
                    return p;
                });
            // is it quiz mode?
            
            var isQuiz = objPoll.options.reduce((p, x)=>{
                if(x.isCorrect===true) {return true;}
                else {return p;}
            }, false);
            objPoll.isQuiz = isQuiz;
            if(isQuiz === true){
                objPoll.correctOptionId = correctOptionId;
            }
            this.postNewPoll(objPoll, ctx)

        }
        catch(e){
            console.log(e);
            //ctx.reply("Bad command format\n" + helpMessage);
        }
    }

    async postNewPoll(objPoll, ctx){
        // creating a poll
        var pollId=0;
        var messageId = 0;
        if(objPoll.isQuiz === true){
            const poll = await ctx
            .telegram
            .sendQuiz(
                    objPoll.chatId,
                    objPoll.name,
                    objPoll.options.map((o)=>o.text),
                    {
                        is_anonymous: false, 
                        correct_option_id: objPoll.correctOptionId,
                        explanation: objPoll.explanation
                    });
            pollId = poll.poll.id;
            messageId = poll.message_id;
        }else{
            const poll = await ctx
            .telegram
            .sendPoll(
                    objPoll.chatId,
                    objPoll.name,
                    objPoll.options.map((o)=>o.text),
                    {
                        is_anonymous: false,
                        //allows_multiple_answers: objPoll.isMultiple
                    });
            pollId = poll.poll.id;
            messageId = poll.message_id;
        }
        await MPoll.create({ pollId: pollId, pollData: JSON.stringify(objPoll), pollOwner: ctx.from.id, pollMessageId: messageId}); 
    }
}

module.exports = {
	AppPool 
};