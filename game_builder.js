const { mongoose } = require("mongoose");
const { MQuizPlan } = require("./data/model");
const { Game } = require("./game");
const { Quiz, QuizOption } = require("./quiz");
const { QuizGame } = require("./quiz_game");

class QuizGameBuilder {

    /**
     * @type {[{sectionId: String, position: Number, quizData:[{position: Number, quizId: String, quiz: Quiz }] }]}
     */
    sections;

    /**
     * @type {Object<string, Quiz>}
     */
    dictQuizzes;


    constructor(){
        
    }

    setQuizPlan = async (quizPlanId) => {
        var quizPlan = await MQuizPlan.aggregate(
            [
                {
                  $match: {
                    'planId': quizPlanId
                  }
                }, {
                  $project: {
                    quizSections: '$quizSections'
                  }
                }, {
                  $unwind: {
                    path: '$quizSections',
                    preserveNullAndEmptyArrays: false
                  }
                }, {
                  $lookup: {
                    from: 'quizzes', 
                    localField: 'quizSections.quizData.quizId', 
                    foreignField: 'quizId', 
                    as: 'quizCollection'
                  }
                }
            ]
        );
        
        if(quizPlan!=null){

            const allQuizzes = quizPlan.flatMap(x=>x.quizCollection);

            this.sections = quizPlan.flatMap(x=>x.quizSections);            

            const dictQuizzes = allQuizzes.reduce((p, x)=>{
              const q = new Quiz();
              q.setId(x.quizId);
              q.setText(x.questionText);
              x.options
                .map(o=>{
                  const qo = new QuizOption();
                  qo.id = o.optionId;
                  qo.isCorrect = o.isCorrect;
                  qo.text = o.text;
                  return qo;
                })
                .forEach(o=>{
                  q.addOptionObject(o);
                });
              p[x.quizId] = q;
              return p;
            }, {});

            this.sections.forEach(x=>{
              x.quizData.forEach(q=>{
                q.quiz = dictQuizzes[q.quizId];
              });
            });

            this.dictQuizzes = dictQuizzes;
        }else{
            throw new Error("Data not found");
        }
    }
    /**
     * @returns { Game }
     */
    build = async () => {
        var g = new QuizGame();

        // create questions
        g.setPlan(this.sections);
        
    }
}

module.exports = {
    QuizGameBuilder
};