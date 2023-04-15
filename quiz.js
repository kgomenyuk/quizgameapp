const { tidy, leftJoin, filter } = require("@tidyjs/tidy");

/**
 * 
 * @param {*} length 
 * @param {string} txt 
 * @returns 
 */
function randomStringUnique(txt) {
    var chars = txt+"";
    var result = '';
    var length = txt.length;
    for (var i = length; i > 0; --i){ 
        if(chars.length<=0){
            break;
        }

        var ch = chars[Math.floor(Math.random() * chars.length)];
        result += ch;
        
        // remove character from the initial text
        chars = chars.replace(ch, "");
    }
    return result;
}

/**
 * один вариант ответа в вопросе
 */
class QuizOption {
    text = "";

    id = 0;

    isCorrect = false;

    optionNumber = 0;
}

/**
 * Содержимое одного вопроса с всеми доступными вариантами ответов
 */
class Quiz {
    
    id = 0;
    /**
     * текст вопроса
     */
    questionText = "";

    /**All available options
     * @type {[QuizOption]} 
     */
    options = [];

    /**
     * @type {[]}
     */
    optionIds = [];
    
    /**
     * список правильных вариантов ответа
     */
    correctIds = [];

    hasCorrectOption = false;

    hasMultipleCorrectOptions = false;

    /**
     * answers received from players
     * @type {[{userId:number, place:number, options:[number], time:Date, result:string, percentCorrect:number}]}
     */
    answers = [];

    /**
     * Question is visible to players
     */
    isStarted = false;

    /**
     * Question was closed
     */
    isClosed = false;

    /**
     * Time when the question became available to players
     * @type {Date}
     */
    timeStarted = null;

    /**
     * how many times the options were shuffled
     */
    shuffleCounter = 0;

    /**
     * указать текст вопроса
     */
    setText = (text) =>{
        this.questionText = text;
    }

    setId = (id) => {
        this.id = id;
    }

    /**
     * Add a new option
     * @param {number} optionId
     * @param {string} optionText 
     * @param {boolean} isCorrect
     * @returns number of a new option
     */
    addOption = (optionText, isCorrect) =>{
        const id = this.options.length;
        const o = new QuizOption();
        o.id = id;
        o.text = optionText;
        o.optionNumber = id;
        if(isCorrect!=null){
            o.isCorrect = isCorrect;
        }
        this.options.push(o);

        return id;
    };

    /**
     * 
     * @param {QuizOption} option 
     */
    addOptionObject = (option) =>{
        if(Object.getPrototypeOf(option) == QuizOption.prototype){
            this.options.push(option);
            const id = this.options.length;
            option.optionNumber = id;
            this.options.push(option);
            return id;
        }else{
            return null;
        }
    };

    /**
     * change one option
     */
    changeOption = (optionId, text, isCorrect) => {

    };
    
    /**
     * Set the question as available for answering
     */
    setQuestionStart = () => {
        if(this.isClosed == true){
            throw new Error("Question was closed");
        }
        const curTime = new Date();
        this.timeStarted = curTime;
        this.isStarted = true;
    }

    /**
     * 
     * @param {string} userId 
     * @param {number|[number]} optionIds 
     * @returns an evaluated answer object
     */
    postAnswer = (userId, optionIds) =>{
        var arrOpts = [];
        var answerCorrect = false;
        if(Array.isArray(optionIds)){
            arrOpts = optionIds.map(x=>{ ansId: x });
        }else{
            arrOpts.push({ansId:optionIds});
        }
        var opts = tidy(this.options, leftJoin(arrOpts, {by:{ ansId: "id" } } ));

        var opts2 = opts
            .filter(x=>x.ansId != null || x.isCorrect == true)
            .map(x=>{
                return {
                    missing: x.ansId == null && x.isCorrect == true ? true:false,
                    correct: x.ansId!=null && x.isCorrect ? true : false,
                    optionId: x.id
                }
            });

        var wrongChoice = 
            opts
            .filter(x=>{
                return (x.ansId==null && x.isCorrect == true) 
                    || (x.ansId!==null && x.isCorrect == false);
            });
        
        var correctChoiceCount =
            tidy(opts, filter(x=>x.isCorrect == true && x.ansId != null)).length;

        var correctCount =
            tidy(opts, filter(x=>x.isCorrect == true )).length;

        var perc = 0.0;
        if(correctCount>0){
            perc = correctChoiceCount/correctCount;
        }

        if(wrongChoice.length == 0 && this.options.length > 0){
            answerCorrect = true;
        }

        var place = this.answers.length;
        var answer = 
            {
                userId: userId,
                place: place,
                options: opts2,
                time: new Date(),
                result: answerCorrect,
                percentCorrect: perc
            };

        this.answers.push(answer);

        return answer;
    }

    calculateScore = () => {
        this.answers
            .forEach(x=>{
                x.score = 40000 - ( x.time.getMilliseconds() - this.timeStarted.getMilliseconds() );
            });
        
        return this.answers;
    };

    shuffleOptions = () => {
        this.shuffleCounter ++;

        if(this.options.length <=1){return;}

        const strOpts = this.options.map((x,i)=>"" + i).join("");
        var shfOpts = randomStringUnique(strOpts);

        //reshuffle if the result did not change
        if(shfOpts == strOpts && this.shuffleCounter > 1){
            // reshuffle manually
            shfOpts = shfOpts.substring(1) + shfOpts[0];
        }

        var newOptions = [];

        for (let index = 0; index < shfOpts.length; index++) {
            const id = shfOpts[index];
            newOptions.push(this.options[Number(id)]);
        };

        this.options = newOptions;
    }

    /**
     * Get results of the quiz
     */
    getResults = () => {
        
    };

    getOptions = () => {
        return this.options;
    }
}

module.exports = {
    Quiz,
    QuizOption
};