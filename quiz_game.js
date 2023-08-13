const { last } = require("@tidyjs/tidy");
const { Game, randomString } = require("./game");
const { Quiz, QuizAnswer } = require("./quiz");
const { QuizRound } = require("./quiz_round");
const { run } = require("jest");

class QuizGame extends Game {

    quizzesArray = []; // all questions
    /**
     * @type {[QuizRound]} All rounds
     */
    roundsArray=[];

    _state = "NEW";

    /**
     * access code for players
     */
    gameIdPlayers = '';
    /**
     * access code for audience
     */
    gameIdAudience = '';

    /**
     * all participants of the game
     * @type {[{ role:String, userId:String }]}
     */
    participants = [];

    /**
     * Unique identifier
     * @type { String }
     */
    uniqueId = "";

    /**
     * Parameters of the game
     */
    parameters = {
        qShow: false,
        qCalc: "R", // rounds by default
        qAudience: false 
    };

    /**
     * Current question
     * @type { Quiz }
     */
    currentQuestion = null;

    display = {
        questionText:"",
        /**@type {[{id:String,value:String, isCorrect: boolean}]} */
        options: [],
        correctOptionId: "",
        optionsText: "", // concatinated options with respective icons : ICON OptionText \n
        questionDisplayText: "" // question with options and their icons
    };

    result = {
        /**@type {boolean} has any team answered the question */
        answered: false,
        /**@type {QuizAnswer} first asnwer of teams */
        answerObject: null,
        /**@type {Object<string,QuizAnswer>} answers of teams*/
        teamAnswers: {}
    };

    /**
     * Icons for buttons
     */
    optionIcons = [
        "🐶",
        "🦊",
        "🐯",
        "🐸"
    ];

    constructor(){
        super();
        this.gameIdPlayers = randomString(4, '0123456789abcdefghijklmnopqrstuvwxzABCDEFGHIJKLMNOPQRSTUVWXZ');
        this.gameIdAudience = randomString(5, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }

    /** Current state
     * 
     * @returns {String} Current state of the game
     */
    getState = ()=>{
        return this._state;
    }

    setState = (state) => {
        if(this._state == "NEW" && state == "WAITING"){
            this._state = state;
            return true;
        }
        if(this._state == "WAITING" && state == "READY"){
            this._state = state;
            return true;
        }
        if(this._state == "WAITING" && state == "ROUND"){
            this._state = state;
            return true;
        }
        
        return false;
        /*
        NEW
        WAITING
        READY
        GAME
        STOP
        FINISHED
        CANCELLED
        ROUND
        */
    }

    nextQuestion = () => {
        if(this.roundsArray[this.round].quizzesArray.length <= this.question){
            return false;
        }
        this.question++;
        const q = this.roundsArray[this.round].quizzesArray[this.question];
        this.currentQuestion = q;

        //this.questions.push([]);
        return true;
    }

    /**
     * Prepare data for currently selected round and question
     */
    prepareQuestion = async () =>{
        const q = this.roundsArray[this.round].quizzesArray[this.question];
        this.currentQuestion = q;
        q.setQuestionStart();
        
        const opts = q.getOptions();
        this.display.options = 
            opts
            .sort(x=>x.optionNumber)
            .map(x=>{
                return {
                    id: x.id,
                    value: x.text,
                    isCorrect: x.isCorrect,
                    icon: this.optionIcons[x.optionNumber],
                    optionNumber: x.optionNumber
                };
            });
        this.result.answered = false;
        this.result.answerObject=null;
        this.result.teamAnswers={};

        this.display.questionText = q.questionText;

        // options as part of message
        // 1-4 options are supported
        const optionsText = this.display.options
            .map(o=>`${ this.optionIcons[o.optionNumber] } ${ o.value }`)
            .join("\n");
        this.display.optionsText = optionsText;
        
        if(this.parameters.qShow == true){
            this.display.questionDisplayText 
            = this.display.questionText + "\n"
                + this.display.optionsText;
        }else{
            this.display.questionDisplayText
                = this.display.optionsText;
        }
        

        const optionC
            = this.display.options.find(x=>x.isCorrect == true);
        if(optionC){
            this.display.correctOptionId = optionC.id;
        }
    }

    /**
     * Save a new answer
     * @param {*} userId 
     * @param {*} answer 
     * @returns { QuizAnswer }
     */
    postAnswer = async  (userId, answer) => {
        //if(this.result.answered == false){
        this.setState("ANSWERED");
        const answerObject
            = this.currentQuestion.postAnswer(userId, answer);
        answerObject.gameId = this.uniqueId;
        answerObject.team = this.getTeamOfPlayer(userId);
        this.result.answered = true;
        this.result.answerObject = answerObject;

        const team = this.getTeamOfPlayer(userId);
        this.result.teamAnswers[team.id + ""] = answerObject;

        return answerObject;        

    };

    /**
     * 
     * @param {*} userId 
     * @returns team of a player
     */
    getTeamOfPlayer = (userId)=>{
        return this.teams.find(x=>x.players.findIndex(p=>p.id==userId>-1));
    }

    /**
     * 
     * @param {Number} round Ordinal number
     * @param {String} roundName Name of the round
     */
    addRound = (round, roundName) => {
        var qr = new QuizRound();
        qr.roundNumber = round;
        qr.name = roundName;
        // add a round to the game
        this.roundsArray.push(qr);
    };

    addQuiz = (round, quiz)=>{
        // add a new quiz to the game
        this.roundsArray.find(x=>x.roundNumber == round).quizzesArray.push(quiz);
    };

    /**
     * get access code for players
     */
    getCodeForPlayers = ()=>{
        return this.gameIdPlayers;
    };

    /**
     * get access code for audience
     */
    getCodeForAudience = ()=>{
        return this.gameIdAudience;
    };

    initialize = (numberOfTeams, membersLimit, owner) => {
        this.ownerId = owner;

        for(var i=0;i<numberOfTeams;i++){
            // create a team
            this.teams.push({
                id: i+1,
                name:"Team " + (i + 1),
                players: []
            });
        }

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

    };
    
    setQuizMaster =  (qmid)=>{
        const qm = this.participants.find(p=>p.role=="qm");
        if(qm!=null){
            qm.userId=qmid;
        }else{
            this.participants.push({role:"qm", userId: qmid});
        }
    }

    getQuizMaster = ()=>{
        return this.participants.find(x=>x.role=="qm");
    }

    setQuizMasterCandidate =  (qmid)=>{
        const qm = this.participants.find(p=>p.role=="qmc");
        if(qm!=null){
            qm.userId=qmid;
        }else{
            this.participants.push({role:"qmc", userId: qmid});
        }
    }

    getQuizMasterCandidate = ()=>{
        return this.participants.find(x=>x.role=="qmc");
    }

    setQuizOwner =  (qmid)=>{
        const qm = this.participants.find(p=>p.role=="admin");
        if(qm!=null){
            qm.userId=qmid;
        }else{
            this.participants.push({role:"admin", userId: qmid});
        }
    }
    getOwner = ()=>{
        return this.participants.find(x=>x.role=="admin");
    }

    setQuizPlayer = (qmid)=>{
        const qm = this.participants.find(p=>p.role=="player" && p.userId == qmid);
        if(qm!=null){
            
        }else{
            this.participants.push({role:"player", userId: qmid, isActive: true});
        }
    }
    removeQuizPlayer = (qmid)=>{
        const qm = this.participants.find(p=>p.role=="player" && p.userId == qmid);
        if(qm!=null){
            qm.userId=qmid;
        }else{
            this.participants.push({role:"player", userId: qmid, isActive: true});
        }
    }
    getPlayers = ()=>{
        return this.participants.filter(x=>x.role=="player" && x.isActive==true);
    }

    getAudience = ()=>{
        return this.participants.filter(x=>x.role=="audience" && x.isActive==true);
    }

    /**
     * 
     * @param {boolean} qShow 
     */
    setQShow = (qShow) => {
        this.parameters.qShow = qShow;
    }

    /**
     * 
     * @param {String} qCalc R (rounds) or Q (questions)
     */
    setQCalc = (qCalc) => {
        this.parameters.qCalc = qCalc;
    }

    /**
     * 
     * @param {Boolean} qAudience 
     */
    setQAudience = (qAudience) => {
        this.parameters.qAudience = qAudience;
    }

    /**
     * @returns { number }
     */
    getNextQuestion = () => {
        var r = this.roundsArray[this.round];
        var nextQ = 0;
        if(r.lastOpenedQuestion == -1){
            nextQ = 0;
        }else{
            nextQ = this.question + 1;
        }
        
        return nextQ;
    };


    /**
     * 
     * @param {number} rNum 
     * @returns { QuizRound }
     */
    startRound = async (rNum) =>{
        var ro = this.roundsArray.find(r=>r.roundNumber == rNum);
        if(ro == null){
            return null;
        }else{
            ro.currentQuestion = -1; this.round = rNum;this.setState("ROUND");
            return ro;
        }
    };

    /**
     * 
     * @param {number} qnum 
     * @returns { Quiz }
     */
    getQuestionObj = (qnum) => {
        var r = this.roundsArray[this.round];
        return r.quizzesArray[qnum];
    };
}

module.exports = {
    QuizGame
};