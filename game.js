function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}



class Game{
    constructor(){
        var rString = randomString(5, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        this.gameId = rString;
    }

    // identifier of a game
    gameId="";

    // paticipants
    /**
     * @type {[{id:number, name:string, players:[number]}]}
     */
    teams=[];

    // owner
    ownerId=0;

    // limit
    membersLimit = 0;

    // rounds
    rounds = 0;

    // current round
    round = 0;

    // round was finished
    roundFinished = false;

    // Quiz Master
    /**
     * @type { string }
     */
    qmId = null;
    qmCandidateId = null;
    // current team
    answeringTeam = null;

    // this game is finished
    gameIsFinished = false;

    // score in each round
    /**
     * @type {[[{ id:number, round:number, answered:boolean, isWinner:boolean, points: number }]]}
     */
    score=[];

    // final score after game is finished
    finalScore={
        hasWinner:false,
        /**
         * @type {[{id:number, points: number, roundsWon:number, isWinner: boolean}]}
         */
        teamsScore:[]
    };

    /** questions in current round
     * @type {[[{answered:boolean, ts:Date, points: number, teamNumber: number, question: number}]]}
     */
    questions=[];

    question = 0;

    /**
     * @type {[{maessage:string, time:Date, team: number}]}
     */
    eventlog=[];
    // initialize the game
    initialize(numberOfTeams, membersLimit, rounds, owner){
        this.ownerId = owner;
        for(var i=0;i<numberOfTeams;i++){
            // create a team
            this.teams.push({
                id: i+1,
                name:"Team " + (i + 1),
                players: []
            });
        }

        this.rounds = rounds;
        this.membersLimit = membersLimit;

        this.score = new Array(this.rounds)
            .fill({})
            .map((x, r) => {
                return this.teams.map(t => {
                    return { 
                        id:t.id, round:r, points: 0, answered: false, isWinner: false 
                    }; 
                } );
            });

        this.finalScore.teamsScore = this.teams
        .map(x => {
            return { 
                id:x.id,
                points: 0,
                roundsWon:0,
                isWinner: false
            };
        });

        // write to the database

    }

    //teams
    /**
     * 
     * @returns { [{id:number, playersCount:number, name:string, players:[number]}] }
     */
    getTeams(){
        return this.teams.map(x=>{return {
            id:x.id,
            playersCount: x.players.length,
            name:x.name,
            players: x.players
        };});
    }

    /**
     * 
     * @param {{message:string, team:number}} m
     */
    log=(m)=>{
        m.time = new Date();
        this.eventlog.push(m);
    };

    getFinalScore(){
        return this.finalScore;
    }

    // register as a player
    /**
     * 
     * @param {*} code 
     * @param {*} teamNumber 
     * @param {number} id  User ID in the external system
     */
    addPlayer = (code, teamNumber, id) => {
        if(code == this.gameId){
            // check if user is already in another team.
            var userTeam = this.teams.find(t=>t.players.indexOf(id)>-1);
            if(userTeam!=null){
                // delete
                userTeam.players.splice(userTeam.players.indexOf(id),1);
            }else{
                // no team
            }
            this.teams.find(x=>x.id == teamNumber).players.push(id);
        }else{
            throw new Error("Wrong code");
        }
    }

    getCode(){
        return this.gameId;
    }

    // next round
    nextRound(){
        if(this.round == this.rounds - 1){
            // impossible to start new round
            return "NO";
        }

        this.questions = [];
        this.questions.push([]);
        this.question = 0;
        
        
        if (this.round > this.rounds - 1){
            // error
            throw new Error("round number exceeds max. value");
        }
        if(this.roundFinished == true){
            this.roundFinished = false;
            this.round++;
        }

        if(this.round == this.rounds - 1){
            // last round
            return "LR";
        }else{
            return "OK";
        }
    }

    // go to next question
    nextQuestion(){
        this.question++;
        this.questions.push([]);
        return true;
    }

    finishGame(){
        if(this.gameIsFinished == true){
            return;
        }
        this.gameIsFinished = true;

        var finalScore = this.score
            .flat(1)
            .map(x=>{return{won:x.isWinner==true?1:0, points:x.points, id:x.id};})
            .reduce((p,x)=>{
                if(p.dictTeams[x.id]==null){
                    var team = { 
                        id:x.id,
                        points: 0,
                        roundsWon:0,
                        isWinner: false
                    };
                    p.dictTeams[x.id] = team;
                    p.teams.push(team);
                }
                p.dictTeams[x.id].points += x.points;
                p.dictTeams[x.id].roundsWon += x.won;
                return p;
            }, {dictTeams:{}, teams:[]})
            .teams
            .sort((a,b)=>b.roundsWon - a.roundsWon);

        if(finalScore.length>1 && finalScore[0].roundsWon>finalScore[1].roundsWon){
            finalScore[0].isWinner=true;
            this.finalScore.hasWinner=true;
        }else{
            this.finalScore.hasWinner=false;
        }
        
        this.finalScore.teamsScore = finalScore;
    }

    // finish round and detect the winner
    /**
     * 
     * @returns { [{teamNumber:number, points:number, isWinner: boolean, answered:boolean, questionsScore:[{ points:number, answered:boolean }]}] }
     */
    finishRound = () => {
        if(this.roundFinished == true)return;
        this.roundFinished = true;

        /**
         * @type {[{answered:boolean, ts:Date, points:number, teamNumber:number, question:number}]}
         */
        var questionStats = [];
        this.teams.forEach(t=>{
            // add combinations with questions
            var qa = [];
            for (let index = 0; index <= this.question; index++) {
                qa.push({ 
                    question: index,
                    answered:false,
                    ts:null,
                    points: 0,
                    teamNumber: t.id
                });
            }
            questionStats = questionStats.concat(qa);
        });

        questionStats.forEach(qs=>{
            // if team & question were already mentioned in the questions array, then skip
            if(this.questions[qs.question]!=null){
                var qx = this.questions[qs.question].find(x=>x.teamNumber == qs.teamNumber);
                if(qx == null){
                    this.questions[qs.question].push(qs); // add missing combination
                }
            }
        });

        var resultOfRound = this
            .questions
            .flat(1)
            .reduce((p, x)=>{
                var team = p.teams.find(t=>t.teamNumber == x.teamNumber)
                team.points += x.points;
                team.questionsScore.push({points:x.points, answered:x.answered});
                if(x.answered == true){
                    team.answered = true;
                }
                
                return p;
            }, {
                teams:this.teams.map(x=>{return { teamNumber:x.id, name:x.name, players:x.players, answered:false, points:0, questionsScore:[] };})
            });
        
        resultOfRound.teams.sort((a,b)=>b.points - a.points);
        
        // winner?
        if(resultOfRound.teams.length > 1){
            if(resultOfRound.teams[0].points > resultOfRound.teams[1].points){
                resultOfRound.teams[0].isWinner = true;
            }
        }

        // fill the score object
        resultOfRound.teams
            .forEach(x=>{
                var scoreElement = this.score[this.round].find(s=>s.id == x.teamNumber);
                scoreElement.answered = true;
                scoreElement.isWinner = x.isWinner == true;
                scoreElement.points = x.points;
            });

        return resultOfRound.teams;

    }

    setAnsweringTeam(tid){
        
        this.answeringTeam = tid;
    }

    // save new score
    postScore(teamNumber, wins){
        //round must be opened
        if(this.roundFinished == true){
            throw new Error("No active round found");
        }

        this.questions[this.question].push({
            answered:true,
            ts:new Date(),
            points: wins==true? 1 : -1,
            teamNumber: teamNumber,
            question:this.question
        });
    }

    /**
     * accept request
     * @type { boolean } accept
     */
    confirmRequestFromJUser = (accept) => {
        
        if(accept == true && this.qmCandidateId != null){
            this.qmId = this.qmCandidateId;
            this.qmIsSet = true;
            
            return true;
        }

        if(accept == false){
            this.qmId = null;
            this.qmIsSet = false;
            return false;
        }

        return false;
    }


    /**
     * 
     * @param {[{teamNumber:number, heading:string,message:string}]} roundResults 
     * @returns 
     */
    printRoundResults = (roundResults)=>{
        const wTeam = roundResults.find(x=>x.isWinner == true);
        var winningTeamId = null;
        if(wTeam!=null){
            winningTeamId = wTeam.teamNumber;
        }
        
        const output = roundResults.map(x=>{
            return {
                teamNumber: x.teamNumber,
                points: x.points,
                rowId:x.name  + " (" + x.points + ")",
                cells:x.questionsScore.map(q=>{
                    return{
                        points: (q.answered==true ? q.points + "" : "--").padStart(4, " ")
                    }
                })
            };
        });

        const table = output
            .map(x=>x.rowId.padEnd(7, " ") + x.cells.map(x=>x.points).join(""))
            .join("\n");
        
        const result = output
            .map(x=>{
                return {
                    teamNumber:x.teamNumber,
                    heading: winningTeamId == null ?  "No winner" : (
                        x.teamNumber == winningTeamId ? "Your team wins" : `${wTeam.name} wins`
                    ),
                    message: table,
                    isWinner:(winningTeamId == x.teamNumber)
                }
            });
        
        return result;
    };
}

module.exports = {
    Game
};