const { mongoose } = require("mongoose");
const { MBot, MProfile, MQuizPlan, MAppSettings, MGameInstance } = require("./model");
const { ObjectId } = require("mongodb");
/**
 * @type {mongoose}
 */
var conn = null;
require("dotenv").config({path:"./.env" });


// try to connect to the database
async function startDb(){
    const c = await mongoose.connect(process.env["DB"]);

    conn = c;
}

async function disconnectDb(){
    await conn.disconnect();
}

function getDb(){
    return conn;
}

/**
 * 
 * @param { String } botCode 
 * @returns { botCode:String, apiKey:String,name:String,isOnline: Boolean,   isDevMode: Boolean,    ftpServer: String,    ftpDir: String,ftpPwd: String,ftpUser: String,ftpPort: String }
 */
async function getBot(botCode)  {

   const botDb = await MBot.findOne({ botCode: botCode }, { _id: 0 } );

   if(botDb){
        const bot = botDb.toObject();
        return bot;
    }
    return null;
};

async function getProfile(userId){
    var d_u
        = await MProfile.findOne({
            id: userId
        });
    return d_u;
};

async function getStaff(){
    var arr_d_u
        = await MProfile.find({
            userRoles: "staff"
        });
    return arr_d_u;
};

async function ensureUser({id, fname, sname, login, role, lang}) {

    const c = await MProfile.findOne({ id: id + "" }, {_id:0});

    if(c == null){
        // user not found in the database
        await MProfile.create({
            id: id, 
                fName:fname,
                login:login,
                fullName: (fname?"":fname + " ") + (sname?"":sname),
                userRole:role,
                sName:sname,
                lang: lang,
                createdDTTM: new Date(),
                timZone: 0
        });

        return {id, fname, sname, login, role, lang};
    }else{
        return c.toObject();
    }
};

/**
 * 
 * @param {Number} ownerId 
 */
async function webGameQuizReportPlans(ownerId){
    const d = await MQuizPlan.aggregate()
    .addFields({
        sectionCount: {
            $size: "$quizSections"
        },
        summary: {
            $map:{
              input: "$quizSections",
              as: "qs",
              in: {
                sectionId: "$$qs.sectionId",
                quizCount: {
                  $size: "$$qs.quizData"
                }
              }
            }
        }
      })
    .match({
        $or:[
            {isSample: true},
            {ownerId:ownerId}
        ]
    })
    .project({ planId:1,
        title:1,
        _id:0,
        addedOn:1, 
        isSample:1,
        sectionCount: 1,
        summary: 1 })
    .sort({addedOn:-1})
    .exec();

    var result = d;
    return result;
}


async function appgame2ReadAppSettings(){
    var d_u
        = await MAppSettings.findOne({
            appAlias: 'game2'
        });
    if(d_u!=null) {    
        return d_u.toObject().settings.map(s=>{
            return {
                name:s.propertyName,
                value: s.propertyValue
            }
        });
    }else{
        return null;
    }
};

/** Check if the code exists
 * 
 * @param {string} code 
 * @returns {boolean}
 */
async function checkPlanExists(code){
    const res = await MQuizPlan.findOne({planId:code}, {planId:1}).exec();
    if(res != null){
        return true;
    }else{
        return false;
    }
}

/** generate a short description of a single quiz game plan
 * @param {String} planId identifier of a game plan
 * @returns { questionsCount: number, questions: [any] }
 */
async function getGamePlanSummary(planId){
    // find the plan and compose its description
    var summary =
    await MQuizPlan.aggregate()
    .match({
        planId: planId
    })
    .addFields({
        sectionCount: { // how many rounds?
            $size: "$quizSections"
        },
        sections: { // summary of sections
            $map:{
              input: "$quizSections",
              as: "qs",
              in: {
                sectionId: "$$qs.sectionId",
                quizCount: {
                  $size: "$$qs.quizData"
                }
              }
            }
        },
        questions: { 
            $reduce: {
            input: "$quizSections",
            initialValue: [],
            in: {
                $concatArrays: [
                "$$value",
                "$$this.quizData"
                ],
            },
            },
        }
    })
    .addFields({
        questions: { // take five questions
            $firstN:{
            n:5,
            input: "$questions"
            }
        },
        questionCount: { // total number of questions
          $reduce:{
            input: "$questions",
            initialValue: 0,
            in:{
              $add:["$$value", 1]
            }
          }
        },
      })
    .unwind(
        {
            path: "$questions", // now each item is a question
            preserveNullAndEmptyArrays: true
        }
    )
    .lookup({
        from: "quizzes",
        localField: "questions.quizId",
        foreignField: "quizId",
        as: "quizDetails",
        pipeline:[
            {
              $project:{ questionText:1, _id:0, quizId:1 } 
            }
          ]
    })
    .group({
        _id: {
          _id: "$_id",
          title: "$title",
          planId: "$planId",
          questionCount: "$questionCount",
          isSample: "$isSample"
        },
        questions: {
        $addToSet:{
          $arrayElemAt: [
            "$quizDetails",
            0
          ]
        }
        }
    })
    .addFields({
        plan: "$_id"
    })
    .project({ 
        plan: 1,
        questions: 1,
        _id: 0
    })
    .exec();


    if(summary!=null && summary.length>0){
        return summary[0];
    } else {
        return null;
    }
}

async function getGameInstanceHeader(giid) {
    const inst = await MGameInstance.findById(new ObjectId(giid));
    if(inst!=null){
        return inst.toObject();
    }else{
        return null;
    }
}

module.exports={
    startDb,
    getDb,
    disconnectDb,
    getBot,
    getProfile,
    ensureUser,
    getStaff,
    webGameQuizReportPlans,
    appgame2ReadAppSettings,
    checkPlanExists,
    getGamePlanSummary,
    getGameInstanceHeader
}