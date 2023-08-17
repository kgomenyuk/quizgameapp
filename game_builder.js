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

    /**
     * 
     * @param {String} quizPlanId 
     */
    setQuizPlan = async (quizPlanId) => {

      const qPlanHeader = await MQuizPlan.findOne({ planId: quizPlanId }, {title: 1 }).exec();
      this.title = qPlanHeader.title;

      // retrieve the plan from the database
        var quizPlan = await MQuizPlan.aggregate(
            [
                {
                  $match: {
                    'planId': quizPlanId
                  }
                }, {
                  $project: {
                    quizSection: '$quizSections'
                  }
                }, {
                  $unwind: {
                    path: '$quizSection',
                    preserveNullAndEmptyArrays: false
                  }
                }, {
                  $lookup: {
                    from: 'quizzes', 
                    localField: 'quizSection.quizData.quizId', 
                    foreignField: 'quizId', 
                    as: 'quizCollection'
                  }
                }
            ]
        );
        
        if(quizPlan!=null){

            const allQuizzes = quizPlan.flatMap(x=>x.quizCollection);

            this.sections = quizPlan.flatMap(x=>x.quizSection).sort((x, y)=>x.position - y.position);            

            // list of all unique questions related to the quiz plan
            const dictQuizzes = allQuizzes.reduce((p, x)=>{
              const q = new Quiz();
              q.setId(x.quizId);
              q.setText(x.questionText);
              x.options
                .map(o=>{
                  const qo = new QuizOption();
                  qo.setMainData(o.optionId, o.text, o.isCorrect);
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
     * @type {Game}
     * @returns { Game }
     */
    build = async (game) => {
        var g = game;
        if(game == null){
           g = new QuizGame();
        }

        g.title = this.title;

        // add rounds
        this.sections.forEach(r=>{
          g.addRound(r.position, r.sectionId);
          r.quizData
            .sort((x, y) => x.position - y.position)
            .forEach(q=>{
              g.addQuiz(r.position, q.quiz);
            });
        });
        
        return g;
        
    }
}

module.exports = {
    QuizGameBuilder
};