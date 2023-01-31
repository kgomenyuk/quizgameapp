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
    // {name of team, [players:{id}]}
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

    // judge
    /**
     * @type { string }
     */
    judgeId = null;
    judgeCandidateId = null;
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

    // 
    questions=[];

    question = 0;

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
    getTeams(){
        return this.teams.map(x=>{return {
            id:x.id,
            playersCount: x.players.length,
            name:x.name
        };});
    }

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
    finishRound = () => {
        if(this.roundFinished == true)return;
        this.roundFinished = true;
        var resultOfRound = this
            .questions
            .flat(1)
            .reduce((p, x)=>{
                var team = p.teams.find(t=>t.id == x.teamNumber)
                team.points += x.points;
                
                return p;
            }, {
                teams:this.teams.map(x=>{return{id:x.id, points:0};})
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
                var scoreElement = this.score[this.round].find(s=>s.id == x.id);
                scoreElement.answered = true;
                scoreElement.isWinner = x.isWinner == true;
                scoreElement.points = x.points;
            });

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
            teamNumber: teamNumber
        });
    }

    /**
     * accept request
     * @type { boolean } accept
     */
    confirmRequestFromJUser = (accept) => {
        
        if(accept == true && this.judgeCandidateId != null){
            this.judgeId = this.judgeCandidateId;
            this.judgeIsSet = true;
            
            return true;
        }

        if(accept == false){
            this.judgeId = null;
            this.judgeIsSet = false;
            return false;
        }

        return false;
    }
}

module.exports = {
    Game
};