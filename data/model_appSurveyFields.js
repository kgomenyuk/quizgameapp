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

/*        MODELS        */

// survey
const MSurveyFields = m.model("survey_fields", CSurveyFields);
const MSurveyFieldsAnswers = m.model("survey_fields_answers", CSurveyAnswers);
module.exports = {
    MSurveyFields, MSurveyFieldsAnswers
}
   