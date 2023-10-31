/**
 * represents state object for a game application
 */
class asoSurveyFields {
    nextField = 0;
    curField = 0;
    prevField = 0;
    maxField = 0;
    /**
     * @type {[fieldName:String, fieldText:String, position:Number]}
     */
    fields = [];
    uid = 0;
    surveyCode = "";
    refCode = "";
    rewriteAnswers = false;
    createdTime = new Date();
    lang = "";
    expected = "";

    currentField = null;

    currentSurvey = {
        _id: null,
        surveyCode: "", // unique key
        createdTime: null,
        uid: null,
        /**
         * @type { [{fieldCode: String, position: Number, fieldText: String, fieldOption: String, createdTime: Date}] }
         */
        surveyFields: [ ]
    };

    id=null;
    fieldObject = {
        fieldCode: "",
        position: 0, 
		fieldText: "",
		fieldOption: "",
		createdTime: null
    };

    groupIds=[];

   }
   
   module.exports = {asoSurveyFields};