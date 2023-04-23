const { Game } = require("./game");
const { Telegraf, Context } = require("telegraf");
const { GameManager } = require("./game_manager");

class GameBot {
    // existing games
    /**
     * @type {[Game]}
     */
    allGames = [];

    /**
     * @type {Object<string, Game>} available game objects
     */
    dictGames = {};

    userData = [];
    /**
     * @type { Object<string, { game:string, id:number, msgId:number }> }
     */
    dictUserData = {};

    /**
     * @type {Object<string, { secErrorsCount:number }>}
     */
    userErrors = {};

    startBot = async () => {
        const tg = new Telegraf(process.env["API_KEY"]);
        tg.catch(e=>{
            console.log(e.message);
        });
        tg.command("ngame", this.startGame);
        tg.command("control", this.setManager);
        tg.command("play", this.setPlayer);
        tg.command("a", this.setAudience);
        tg.command("help", this.sendHelp);
        tg.on("callback_query", async (ctx)=>{
            const d = ctx.callbackQuery.data;
            const cmds = d.split("!");
            switch(cmds[0]){
                case "psteam":
                    // player selected a team
                    await this.setPlayersTeam(ctx, cmds[1]);
                    break;
                case "qm":
                    await this.setConfirmation(ctx, cmds[1], cmds[2]);
                    break;
                case "answer":
                    // the team decided to answer the question
                    await this.setAnsweringTeam(ctx, cmds[1]);
                    break;
                case "evaluate":
                    // correctness of the answer
                    await this.setAnswerCorrectness(ctx, cmds[1], cmds[2]);
                    break;
                case "nquestion":
                    // switch to the next question
                    await this.nextQuestion(ctx);
                    break;
                case "nround":
                    // switch to the next round
                    await this.nextRound(ctx);
                    break;
                case "fround":
                    await this.beginFirstRound(ctx);
                    break;
                case "ngame":
                    // switch to the next round
                    await this.endGame(ctx);
                    break;
            };
        })
        
        await tg.launch();
    };

    sendHelp = async (ctx)=>{
        // show help text
        await ctx.reply(
        "/ngame  - create a new game\n" +
        "/play Secret - register in a game\n" +
        "/control Secret - become a quiz master\n" +
        "/a Secret - join the audience");
    };


    /**
     * @param { Context } ctx 
     */
    setAudience = async (ctx) => {
        // register a new person as member of audience
        const my = this.dictUserData["u" + ctx.callbackQuery.from.id];

        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        // ctx.message.date
        const text = ctx.message.text;
        const args = text.split(" ");
        const code = args[1].substr(0, 5);
        const game = this.dictGames[code];

        game.addPlayer(code, ctx.message.from.id);
    };

    /**
     * 
     * @param { Context } ctx 
     * @param {number} teamId 
     */
    setAnsweringTeam = async (ctx, teamId) => {
        const my = this.dictUserData["u" + ctx.callbackQuery.from.id];

        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        
        const tid = Number(teamId);
        const game = this.dictGames[my.game];
        var manager = new GameManager(game, ctx.telegram);
        // check user and sed message with buttons
        if(game.qmId == ctx.callbackQuery.from.id){
            game.setAnsweringTeam(teamId);
            const teamName = game.getTeams().find(x=>x.id == teamId).name;
            await ctx.editMessageReplyMarkup({});
            await manager.notifyTeam(teamId, "Your team will answer question №" + (game.question + 1));
            await ctx.reply(teamName + " will answer question №" + (game.question + 1) + "\n" 
                +"Review their answer:", 
            {
                reply_markup:{
                    inline_keyboard:[
                        [
                            {callback_data:"evaluate!" + teamId + "!ok", text:"Correct"},
                            {callback_data:"evaluate!" + teamId + "!no", text:"Wrong"}
                        ]
                    ]
                }
            });
            if(my.msgId != null){
                
                my.msgId = null;
            }
        }else{
            await ctx.reply("Not allowed");
        }
        
    };

    /**
     * 
     * @param {Context} ctx 
     * @returns 
     */
    endGame = async (ctx) => {
        var my = this.dictUserData["u" + ctx.callbackQuery.from.id];
        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        const game = this.dictGames[my.game];
        if(game.qmId!=ctx.callbackQuery.from.id){
            await ctx.reply("Game is closed");
            return;
        }
        var teams = game.getTeams();
        
        var manager = new GameManager(game, ctx.telegram);
        await manager.finishRound();
        game.finishGame();

        var teams = game.getTeams();

        var finalMessage = "";
        if(game.finalScore.hasWinner == false){
            finalMessage = "The winner cannot be determined";
        }else{
            var team = teams.find(t=>t.id == game.finalScore.teamsScore[0].id);
            finalMessage = team.name + " wins";
        }
        
        await ctx.telegram.sendMessage(game.qmId, finalMessage);
        await ctx.telegram.sendMessage(game.ownerId, finalMessage);
        
        var mtext = 
            game.finalScore.teamsScore.map((x, i)=>{
                var t = teams.find(t=>t.id == x.id);
                return (x.isWinner==true ? " W " : "").padStart(3, " ") + 
                    t.name + 
                    (" R:" + x.roundsWon).padStart(5, " ") + 
                    (" P:" + x.points).padStart(5, " ");
            })
            .join("\n");
        
        const msg = await ctx.telegram.sendMessage(
            game.qmId, 
            "`"+mtext+"`",
            {parse_mode:"Markdown"}
            );
        
        delete this.dictUserData["u" + game.qmId];

        await ctx.answerCbQuery();
    };


    /**
     * 
     * @param {Context} ctx 
     * @returns 
     */
    beginFirstRound = async (ctx) => {
        var my = this.dictUserData["u" + ctx.callbackQuery.from.id];
        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        const game = this.dictGames[my.game];
        if(game.ownerId!=ctx.callbackQuery.from.id){
            await ctx.reply("Game is closed");
            return;
        }
        var teams = game.getTeams();
        
        var info = game.nextRound();
        if(info == "LR")
        {
            await ctx.reply("Last Round");
        }

        const teamsKb = teams.map(t=>{
            return {
                text: t.name, 
                callback_data: "answer!" + t.id
            };
        })
        .map(b=>[b]);
        var msg = await ctx.telegram.sendMessage(
            game.qmId, 
            "Round " + (game.round+1) + ", Question " + (game.question+1) + ". Who will answer?",
            {
                reply_markup:{
                    inline_keyboard:
                        teamsKb
                }
            });
        var my = this.dictUserData["u" + game.qmId];
        my.msgId = msg.message_id;

        var msg = await ctx.telegram.sendMessage(
            game.qmId, 
            "Round " + (game.round+1) + " begins");
        var my = this.dictUserData["u" + game.ownerId];
        my.msgId = msg.message_id;

        await ctx.answerCbQuery();

    };


    /**
     * 
     * @param {Context} ctx 
     * @returns 
     */
    nextRound = async (ctx) => {
        var my = this.dictUserData["u" + ctx.callbackQuery.from.id];
        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        const game = this.dictGames[my.game];
        if(game.qmId!=ctx.callbackQuery.from.id && game.ownerId!=ctx.callbackQuery.from.id){
            await ctx.reply("Game is closed");
            return;
        }
        var teams = game.getTeams();
        
        var manager = new GameManager(game, ctx.telegram);
        await manager.finishRound();
        
        var info = game.nextRound();
        if(info == "LR")
        {
            await ctx.reply("Last Round");
        }

        const teamsKb = teams.map(t=>{
            return {
                text: t.name, 
                callback_data: "answer!" + t.id
            };
        })
        .map(b=>[b]);
        const msg = await ctx.telegram.sendMessage(
            game.qmId, 
            "Round " + (game.round+1) + ", Question " + (game.question+1) + ". Who will answer?",
            {
                reply_markup:{
                    inline_keyboard:
                        teamsKb
                }
            });
        var my = this.dictUserData["u" + game.qmId];
        my.msgId = msg.message_id;

        await ctx.answerCbQuery();

    };

    /**
     * 
     * @param {Context} ctx 
     * @returns 
     */
    nextQuestion = async (ctx) => {
        var my = this.dictUserData["u" + ctx.callbackQuery.from.id];
        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        const game = this.dictGames[my.game];
        if(game.qmId!=ctx.callbackQuery.from.id){
            await ctx.reply("Game is closed");
            return;
        }
        var teams = game.getTeams();
        game.nextQuestion();

        const teamsKb = teams.map(t=>{
            return {
                text: t.name, 
                callback_data: "answer!" + t.id
            };
        })
        .map(b=>[b]);
        const msg = await ctx.telegram.sendMessage(
            game.qmId, 
            "Round " + (game.round+1) + ", Question " + (game.question+1) + ". Who will answer?",
            {
                reply_markup:{
                    inline_keyboard:
                        teamsKb
                }
            });
        var my = this.dictUserData["u" + game.qmId];
        my.msgId = msg.message_id;

        await ctx.answerCbQuery();
    };


    /**
     * 
     * @param {Context} ctx 
     * @param {string} gameId 
     * @param {string} actionCode 
     */
    setAnswerCorrectness = async (ctx, teamId, actionCode) => {
        var my = this.dictUserData["u" + ctx.callbackQuery.from.id];
        if(my == null || my.game == null){
            await ctx.reply("Game is closed");
            return;
        }
        const tid = Number(teamId);
        const game = this.dictGames[my.game];
        if(game.qmId!=ctx.callbackQuery.from.id){
            await ctx.reply("Game is closed");
            return;
        }
        var teams = game.getTeams();
        var aTeam = teams.find(x=>x.id == game.answeringTeam);
        var manager = new GameManager(game, ctx.telegram);

        switch(actionCode){
            case "ok":
                game.postScore(game.answeringTeam, true);
                // next question? next round? 
                game.answeringTeam = null;
                await manager.notifyTeam(teamId, "Your answer on question №"+ (game.question + 1)  +" is correct!" );
                    // next question, next round
                    var kb = [
                        [{text:"Next Question", callback_data:"nquestion"}]
                    ];

                    if(game.round < game.rounds-1){
                        kb.push([{text:"Finish Round", callback_data:"nround"}]);
                    }else{
                        kb.push([{text:"Finish Game", callback_data:"ngame"}]);
                    }
                    
                    var msg = await ctx.telegram.sendMessage(
                        game.qmId, 
                        aTeam.name + " won!",
                        {
                            reply_markup:{
                                inline_keyboard:
                                    kb
                            }
                        });
                    var my = this.dictUserData["u" + game.qmId];
                    my.msgId = msg.message_id;
                
                break;
            case "no":
                game.postScore(game.answeringTeam, false);
                await manager.notifyTeam(teamId, "Your answer on question №"+ (game.question + 1)  +" is wrong!" );
                // ask another team? next question? or next round?
                var teamsKb = teams.map(t=>{
                    return {
                        text: t.name, 
                        callback_data: "answer!" + t.id
                    };
                })
                .map(b=>[b]);
                teamsKb = teamsKb.concat([
                    [{text:"Next Question", callback_data:"nquestion"}], 
                    [{text:"Finish Round", callback_data:"nround"}]
                ]);
                var msg = await ctx.telegram.sendMessage(
                    game.qmId, 
                    aTeam.name + " has failed. Who will try one more time?",
                    {
                        reply_markup:{
                            inline_keyboard:
                                teamsKb
                        }
                    });
                var my = this.dictUserData["u" + game.qmId];
                my.msgId = msg.message_id;
                
                break;
        }
        await ctx.answerCbQuery();
    };

    

     /** accept or reject the request from judging user
     * 
     * @param { Context } ctx 
     * @param { string } actionCode
     * @param { string } gameId
     */
    setConfirmation = async (ctx, gameId, actionCode) => {
        // actionCode: confirm, reject
        const game = this.dictGames[gameId];
        

        if(game == null ){
            await ctx.reply("Cannot connect to game");
            return;
        }else{
            
        }
        switch(actionCode){
            case "confirm":
                game.confirmRequestFromPMUser(true);
                if(game.qmCandidateId!=null){
                    await ctx.telegram.sendMessage(game.qmCandidateId, "Your request was confirmed");

                    //Send the start button 
                    await ctx.telegram.sendMessage(game.ownerId, "Now it's time to start the game", {
                        reply_markup:{
                            inline_keyboard:[[
                                {callback_data:"fround!" + game.code, text:"Start!"},
                                {callback_data:"cround!" + game.code, text:"Cancel game"}
                            ]]
                        }
                    });
                }
                await ctx.answerCbQuery();
                break;
            case "reject":
                const cid = game.qmCandidateId;
                game.confirmRequestFromPMUser(false);
                if(cid != null){
                    await ctx.telegram.sendMessage(cid, "Sorry, your request was rejected");
                }
                await ctx.answerCbQuery();
                break;
        }
    };

     /**
     * 
     * @param { Context } ctx 
     */
    setManager = async (ctx) => {
        // apply
        const text = ctx.message.text;
        const args = text.split(" ");
        const code = args[1].substr(0, 5);
        const game = this.dictGames[code];
        // does the game exist?
        if(game == null || args.length < 2){
            return;
        }

        this.dictUserData["u"+ctx.message.from.id] = {game: code, id: ctx.message.from.id, msgId: null};
        
        if(game != null){
            if(game.qmCandidateId!=null && game.qmCandidateId!=0){
                await ctx.reply("The request has been already sent"); 
                return;
            }
            game.qmCandidateId = ctx.message.from.id; // this person applies for a quiz master role
            const name = 
                (ctx.message.from.username==null?"":(ctx.message.from.username+" ")) +
                (ctx.message.from.first_name==null?"":(ctx.message.from.first_name+" ")) +
                (ctx.message.from.last_name==null?"":(ctx.message.from.last_name + " "));
            game.qmIsSet = false;
            await ctx.telegram.sendMessage(game.ownerId, "Please, confirm that user " + name + " will manage the game", {
                reply_markup:{
                    inline_keyboard:[
                        [
                            { text:"Confirm", callback_data:`qm!${code}!${"confirm"}` },
                            { text:"Reject", callback_data:`qm!${code}!${"reject"}` }
                        ]
                    ]
                }
            });
            return;
        }else{
            if(this.userErrors["u" + ctx.from.id] == null){
                this.userErrors["u" + ctx.from.id] = {secErrorsCount:0};
            }
            this.userErrors["u" + ctx.from.id]++;
            await ctx.reply("Cannot connect to game");
            return;
        }
    };

     /**
     * 
     * @param { Context } ctx 
     */
     setPlayer = async (ctx)=>{
        const text = ctx.message.text;
        // split
        const args = text.split(" ");
        // 1 = game code
        const code = args[1].substr(0, 5);

        const game = this.dictGames[code];
        if(game!=null){
            const teams = game.getTeams();
            if(teams.length>0){
                this.dictUserData["u" + ctx.message.from.id] = {game: code, id: ctx.message.from.id, msgId:null};
                this.userData.push(this.dictUserData["u" + ctx.message.from.id]);

                const teamsKb = teams.map(t=>{
                    return {
                        text: t.name, 
                        callback_data: "psteam!" + t.id
                    };
                })
                .map(b=>[b]);

                await ctx.reply("Select your team", {
                    reply_markup:{
                        inline_keyboard: teamsKb
                    }
                });

            }else{
                await ctx.reply("Game is not available");
            }
            
        }else{
            await ctx.reply("Game is not available");
        }
     };

     /**
     * 
     * @param { Context } ctx Register as a player
     */
     setPlayersTeam = async (ctx, data) => {
        const my = this.dictUserData["u" + ctx.callbackQuery.from.id];

        if(my != null && my.game != null){
            const tid = Number(data);
            const game = this.dictGames[my.game];
            game.addPlayer(my.game, tid, ctx.callbackQuery.from.id);
            await ctx.reply("Now you are in " + game.getTeams().find(t=>t.id==tid).name);
        }

        await ctx.answerCbQuery();
     };

    // start a new game with N teams
    /**
     * 
     * @param { Context } ctx 
     */
    startGame = async (ctx)=>{
        const text = ctx.message.text;
        // split
        const args = text.split(" ");
        if(args.length < 4){
            await ctx.reply("Command should include parameters: /ngame numberOfTeams teamMembersLimit rounds\nE.g., /ngame 2 3 4");
            return;
        }
        // 2 = nr of teams
        const teams = Number(args[1]);
        // 3 = team members limit
        const limit = Number( args[2]);
        // 4 = rounds
        const rounds = Number( args[3]);

        const g = new Game();
        const code = g.getCode();
        g.initialize(teams, limit, rounds, ctx.message.from.id);

        this.allGames.push(g);
        this.dictGames[code] = g;

        // attach game to current user
        this.dictUserData["u"+ctx.message.from.id] = { game: code, id: ctx.message.from.id, msgId: null };

        // send code to the chat
        await ctx.reply("Game code is: " + code);
    }

    // check my score

    // stop the game

}


module.exports = {
    GameBot
};