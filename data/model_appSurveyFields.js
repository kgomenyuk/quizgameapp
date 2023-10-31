var m = require("mongoose");

/*        SCHEMAS        */

const CSurveyFields = new m.Schema(
    {
        surveyCode: String, // non-unique key of a survey
        refCode: String, // reference id
        rewriteAnswers: Boolean, // rewrite or append new answers if the user had already answered
        description: {
            ru: String,
            en: String
        },
        active: Boolean,
        surveyFields: [
            {
                fieldCode: String, 
                fieldDescription: {
                    ru: String,
                    en: String
                },
                fieldType: String,
                position: Number
            }
        ]
    }
);

const CSurveyAnswers = new m.Schema(
    {
        _id: m.SchemaTypes.ObjectId,
        surveyCode: String, // unique key
        refCode: String,
        createdTime: Date,
        uid: String,
        lang: String,
        surveyFields: [
            {
                fieldCode: String, 
                position: Number, 
                fieldText: String,
                fieldOption: String,
                createdTime: Date
            }
        ]
    }
);

class MSurveyFieldsQuery {

    /**
     * 
     * @param { String } refCode 
     * @returns {[any]}
     */
    static async getAllResults(surveyCode, refCode) {
        var query = [
            {
              $match: {
                refCode: refCode,
                surveyCode: surveyCode,
              },
            },
            {
              $project:
                /**
                 * specifications: The fields to
                 *   include or exclude.
                 */
                {
                  createdTime: 1,
                  uid: 1,
                  lang: 1,
                  surveyFields: 1,
                  _id: 0,
                },
            },
            {
              $addFields:
                /**
                 * query: The query in MQL.
                 */
                {
                  cols: {
                    $map: {
                      input: "$surveyFields",
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
                  surveyFields: 0,
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
                  "cols.lang": "$lang",
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
            },
            {
              $sort:
                /**
                 * Provide any number of field/order pairs.
                 */
                {
                  sname: 1,
                  fname: 1,
                },
            },
          ];

        var result = 
            await MSurveyFieldsAnswers.aggregate(query).exec();
        
        return result;
    }
}

/*        MODELS        */

// survey
const MSurveyFields = m.model("survey_fields", CSurveyFields);
const MSurveyFieldsAnswers = m.model("survey_fields_answers", CSurveyAnswers);
module.exports = {
    MSurveyFields, MSurveyFieldsAnswers, MSurveyFieldsQuery
}
   