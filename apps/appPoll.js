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

/**
 * App responsible for poll functionality.
 */
class AppPoll extends AppBase {
    refCode = "";

    _init() {
		this.app = "poll";
        this.isPublicAllowed = true;
        this.createPollCommand = "poll_c";
        this.finishPollCommand = "poll_f";
        this.leaderboardComman = "poll_lb";
        this.listOpenedPollsCommand = "poll_lst";
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

    _loadApplicationSettings = async (a) =>{
		
		var settings = await super._loadApplicationSettings(a);
		
        this.pointsAdminId = settings.pointsAdminId;
        this.checkAdmin = settings.checkAdmin ?? true;

        this.refCode = settings.refCode;
    }
	
	_getTriggers(){
		var createPollTrigger = new TGCommandEventTrigger("poll_c", this.createPollCommand, null);
		createPollTrigger.handlerFunction = this.create_poll;	

        var finishPollTrigger = new TGCommandEventTrigger("poll_f", this.finishPollCommand, null);
		finishPollTrigger.handlerFunction = this.finish_poll;	

        var leaderboardTrigger = new TGCommandEventTrigger("poll_lb", this.leaderboardComman, null);
		leaderboardTrigger.handlerFunction = this.leaderboard;

        var listOpenedPollsTrigger = new TGCommandEventTrigger("poll_lst", this.listOpenedPollsCommand, null);
        listOpenedPollsTrigger.handlerFunction = this.list_open_polls;

        // the first available handler will be used
        

		return [
			createPollTrigger,
            finishPollTrigger,
            leaderboardTrigger,
            listOpenedPollsTrigger
			];
	}

    /**
	 * Processes users poll anwer (from telegram poll API callback).
     * User can add answer or cancell answer.
     * Deletes user message with command.
	 * @param {Context} ctx 
	 */
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
                await MAnswer.create({pollId: pollId, userId: ctx.update.poll_answer.user.id, answerId: option, chatId: poll.pollChatId, isCorrect: isCorrect});
            }

            const user = ctx.update.poll_answer.user;
            await mdb.ensureUser({id: user.id, fname: user.first_name, sname: user.last_name, login: user.username, role: null, lang: user.language_code})
        }
        catch(e){
            console.log(e);
        }
    }

    /**
     * Processes @see {leaderboardComman} command.
	 * Prints users leaderboard.
     * Deletes user message with command.
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
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

    /**
     * Processes @see {finishPollCommand} command.
	 * Finishes poll or polls.
     * There ara 2 modes for this command:
     *  1. Users reply to poll message with finish command. Then poll closes.
     *  2. User call finish command with comma separated poll ids. Then all poll with passed ids finishes.
     * Deletes user message with command.
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
    async finish_poll(s, ctx, state){
        try{
            s.watchMessage();
            await ctx.deleteMessage(ctx.message.message_id);
            if(this.checkAdmin && s.userId != this.pointsAdminId ){
                return false;
            }

            if(!ctx.update.message?.reply_to_message?.message_id)
            {
                await this.finish_poll_by_ids(s, ctx, state);
                return;
            }

            const poll = await MPoll.findOne({pollMessageId: ctx.update.message.reply_to_message.message_id}).exec();
            if(!poll)
                return;

            var pollId = poll.pollId;
            if(poll.pollOwner != ctx.from.id)
                return;

            poll.pollFinished=true;

            await MPoll.updateOne(
                {pollMessageId: ctx.update.message.reply_to_message.message_id},
                poll);

            await ctx.telegram.stopPoll(poll.pollChatId, poll.pollMessageId);

        }
        catch(e){
            console.log(e);
        }
    }


    /**
	 * Finishes polls by ids.
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
    async finish_poll_by_ids(s, ctx, state){
        const cmdLength = ctx.message.entities[0].length;
        const text = ctx.message.text.substr(cmdLength + 1);
        const pollCodes = text.trim(" ").trim(",").split(',');
        let error = '';
        for(let i=0; i< pollCodes.length; i++){
            const pollCode = pollCodes[i];
            const poll = await MPoll.findOne({pollCode: pollCode}).exec();
            if(!poll){
                if(error != '')
                    error += '\n';
                error += "Poll ["+pollCode +"] not foound";
                continue;
            }
            if(poll.pollOwner != ctx.from.id){
                if(error != '')
                    error += '\n';
                error += "Poll ["+pollCode +"] is not yours";
                continue;
            }
            if(poll.pollFinished){
                if(error != '')
                    error += '\n';
                error += "Poll ["+pollCode +"] already finished";
                continue;
            }
            poll.pollFinished=true;

            await MPoll.updateOne(
                {pollCode: pollCode},
                poll).exec();

            await ctx.telegram.stopPoll(poll.pollChatId, poll.pollMessageId);
        }

        if(error != '')
            ctx.reply(error);
    }

    /**
     * Processes @see {listOpenedPollsCommand} command.
	 * Lists active polls with ids and questions.
     * Deletes user message with command.
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
    async list_open_polls(s, ctx, state){
        try{
            s.watchMessage();
            await ctx.deleteMessage(ctx.message.message_id);
            if(this.checkAdmin && s.userId != this.pointsAdminId ){
                return false;
            }

            const chatId = ctx.chat.id;
            const polls = await MPoll.find({pollChatId: chatId, pollFinished: false}).exec();

            if(polls.length == 0){
                ctx.reply("No active polls.");
                return;
            }

            let result = "Active polls:";
            for(let i=0; i< polls.length; i++){
                const poll = polls[i];
                const pollData = JSON.parse(poll.pollData);
                result += "\n\t[";
                result += poll.pollCode;
                result += "] ";
                result += pollData.name.substring(0, 15);
                if(pollData.name.length > 15){
                    result+="..."
                }
            }
            ctx.reply(result);
        }
        catch(e){
            console.log(e);
        }
    }

    /**
	 * Genereate id with number and letters (like NanoId).
	 * @param {Number} length Length of id
	 */
    makeid(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }


    /**
     * Processes @see {createPollCommand} command.
	 * Crates poll with given question and answers.
     * Deletes user message with command.
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
    async create_poll(s, ctx, state){

        const helpMessage = "Greate poll with command: /"+this.createPollCommand+" {question}?{anser1};{answer2};...;{anser N}\n To mark correct answer add '*' in the begginning of the answer."
        try{
            s.watchMessage();
            await ctx.deleteMessage(ctx.message.message_id);
            if(this.checkAdmin && s.userId != this.pointsAdminId ){
                return false;
            }

            const cmdLength = ctx.message.entities[0].length;
            const text = ctx.message.text.substr(cmdLength + 1);
            if(text == 'help'){
                ctx.reply(helpMessage);
                return;
            }

            const arrPoll =  text.split("?");
            const arrOptions = arrPoll[1].trim(";").trim(" ").split(";").filter(x => x.length > 0);
            const namePoll = arrPoll[0];
            const chatId = ctx.chat.id;
            const objPoll = {
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
            this.postNewPoll(objPoll, ctx, chatId)

        }
        catch(e){
            console.log(e);
            //ctx.reply("Bad command format\n" + helpMessage);
        }
    }

    /**
     * Creates telgramm poll in chat.
     * Stores poll in DB.
	 * @param {Object} objPoll 
	 * @param {Context} ctx 
	 * @param {Number} chatId 
	 */
    async postNewPoll(objPoll, ctx, chatId){
        // creating a poll
        var pollId=0;
        var messageId = 0;
        if(objPoll.isQuiz === true){
            const poll = await ctx
            .telegram
            .sendQuiz(
                    chatId,
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
                    chatId,
                    objPoll.name,
                    objPoll.options.map((o)=>o.text),
                    {
                        is_anonymous: false,
                    });
            pollId = poll.poll.id;
            messageId = poll.message_id;
        }
        await MPoll.create({ pollId: pollId, pollChatId: chatId, pollData: JSON.stringify(objPoll),
            pollOwner: ctx.from.id, pollMessageId: messageId, pollFinished: false, pollCode: this.makeid(10)}); 
    }
}

module.exports = {
	AppPoll 
};