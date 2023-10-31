var m = require("mongoose");
const { MSurveyFieldsAnswers } = require("./model_appSurveyFields");

/*        SCHEMAS        */

const CPoints = new m.Schema(
    {
        refCode: String, // reference id
        pointsCode: String, // name of grade (e.g. lab1, lab2, exam, etc.)
        author: String, // user who posted the points
        comment: String, // details about the mark
        isPosted: Boolean,
        hasNewChanges: Boolean,
        timePosted: Date,
        timeChanged: Date,
        uid: String, // user that will receive the points
        pointsAmt: Number, // points won
        history:[{
            timeChanged: Date,
            pointsAmt: Number,
            author: String
        }]
    }
);

/*   named categories of points   */
const CPointsCategory = new m.Schema (
    {
        refCode: String,    // reference id
        pointsCode: String, // name of grade (e.g. lab1, lab2, exam, etc.)
        author: String,     // user who posted the points
        comment: String,    // details about the mark
        timePosted: Date,    // when it was posted
        isHidden: Boolean
    }
);

const CPointsAudience = new m.Schema (
    {
        refCode: String,    // reference id
        uid: String,     
        fname: String,    // details about the mark
        lname: String,    // details about the mark
        email: String,
        timePosted: Date    // when it was posted
    }
);

class MPointsQuery {

    /**
     * 
     * @param { String } refCode 
     * @returns {[any]}
     */
    static async updateAudience(surveyCode, refCode) {

        var query = [
            {
              $match:
                /**
                 * query: The query in MQL.
                 */
                {
                  refCode: refCode,
                  surveyCode: surveyCode,
                  surveyFields: {
                    $elemMatch: {
                      $and: [
                        {
                          fieldCode: "botgrades",
                        },
                        {
                          fieldOption: "yes",
                        },
                      ],
                    },
                  },
                },
            },
            {
              $project:
                /**
                 * specifications: The fields to
                 *   include or exclude.
                 */
                {
                  refCode: 1,
                  surveyCode: 1,
                  uid: 1,
                  createdTime: 1,
                  fields: {
                    $filter: {
                      input: "$surveyFields",
                      as: "x",
                      cond: {
                        $in: [
                          "$$x.fieldCode",
                          ["fname", "lname", "email"],
                        ],
                      },
                    },
                  },
                },
            },
            {
              $addFields:
                /**
                 * newField: The new field name.
                 * expression: The new field expression.
                 */
                {
                  cols: {
                    $map: {
                      input: "$fields",
                      as: "x",
                      in: [
                        "$$x.fieldCode",
                        {
                          $cond: [
                            {
                              $eq: ["$$x.fieldOption", ""],
                            },
                            "$$x.fieldText",
                            "$$x.fieldOption",
                          ],
                        },
                      ],
                    },
                  },
                },
            },
            {
              $project:
                /**
                 * specifications: The fields to
                 *   include or exclude.
                 */
                {
                  uid: 1,
                  refCode: 1,
                  surveyCode: 1,
                  createdTime: 1,
                  lang: 1,
                  cols: {
                    $arrayToObject: "$cols",
                  },
                },
            },
            {
              $addFields:
                /**
                 * newField: The new field name.
                 * expression: The new field expression.
                 */
                {
                  "cols.uid": "$uid",
                  "cols.createdTime": "$createdTime",
                  "cols.refCode": "$refCode",
                  "cols.surveyCode": "$surveyCode",
                },
            },
            {
              $replaceRoot:
                /**
                 * replacementDocument: A document or string.
                 */
                {
                  newRoot: "$cols",
                },
            }
          ];

        var data = 
            await MSurveyFieldsAnswers.aggregate(query).exec();

        var updates = [];
        for (let i = 0; i < data.length; i++) {
            var update = {
                updateOne: {
                    filter: {
                        uid: data[i].uid, 
                        refCode: data[i].refCode 
                    },
                    update: data[i],
                    upsert: true
                }
            };
            updates.push(update);
        }
        
        var result = (await MPointsAudience.bulkWrite(updates)).insertedCount + (await MPointsAudience.bulkWrite(updates)).modifiedCount;
        
        return result;
    }

    static async getAllGradingCategories(refCode){
      var list = await MPointsCategory.find({ refCode: refCode, isHidden:false }).exec();
      var out = list.map(x => x.pointsCode);
      return out;
    }

    /**
     * 
     * @param {String} refCode 
     * @param {String} gradeCat 
     */
    static async findUngraded(refCode, gradeCat){
      var query = [
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              refCode: refCode,
            },
        },
        {
          $limit: 10
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: "points_users",
              let: {
                f_uid: "$uid",
                f_ref: "$refCode",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {$eq: ["$$f_uid", "$uid"]},
                        {$eq: ["$$f_ref", "$refCode"]},
                        {$eq: [gradeCat, "$pointsCode"]}
                      ],
                    },
                  },
                },
              ],
              as: "grade",
            },
        },
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              grade: [],
            },
        },
      ];

      var result = await MPointsAudience.aggregate(query).exec();

      return result;

    }
    /**
     * 
     * @param {String} refCode 
     * @param {[String]} arrUsers 
     */
    static async findAud(refCode, arrUsers){
      var aud = await MPointsAudience.find({
          uid: { $in: arrUsers },
          refCode: refCode
      }, {
        _id:0
      }).exec();

      var res = aud.map(x=>x.toObject());
      return res;
    }

    static async getPoints(refCode, uid){
      var result = await MPoints.find({
        uid: uid,
        refCode: refCode
      }).exec();

      result = result.map(x=>x.toObject());

      return result;
    }

    static async getUsersPoints(refCode, pointsCode){
      var query = [
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              refCode: refCode,
              pointsCode: pointsCode,
            },
        },
        {
          $project:
            /**
             * specifications: The fields to
             *   include or exclude.
             */
            {
              refCode: 1,
              _id: 0,
              uid: 1,
              pointsAmt: 1,
              timeChanged: 1,
            },
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: "points_auds",
              as: "user",
              let: {
                f_uid: "$uid",
                f_ref: "$refCode",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ["$$f_uid", "$uid"],
                        },
                        {
                          $eq: ["$$f_ref", "$refCode"],
                        },
                      ],
                    },
                  },
                },
              ],
            },
        },
      ];

      var result = await MPoints.aggregate(query).exec();

      return result;
    }
}


/*        MODELS        */

// points
const MPoints = m.model("points_user", CPoints);

// categories
const MPointsCategory = m.model("points_cat", CPointsCategory);

// audience of the application
const MPointsAudience = m.model("points_aud", CPointsAudience);

module.exports = {
    MPoints, MPointsCategory, MPointsAudience, MPointsQuery
};
   