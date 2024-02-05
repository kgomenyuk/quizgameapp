/**
 * grades
 */
class asoPointsSender {
    
    /**
     * @type {[fieldName:String, fieldText:String, position:Number]}
     */
    fields = [];
    uid = 0;
    surveyCode = "";
    refCode = "";
    pointsCode = "";
    pointsAmt = 0;
    author = "";
    
    rewriteAnswers = false;
    createdTime = new Date();
    lang = "";
    expected = "";

    users=[];

    currentField = null;

    currentGrade = {
        _id: null,
        refCode: "", // unique key
        personid:""
    };

    id=null;
    fieldObject = {
        fieldCode: "",
        position: 0, 
		fieldText: "",
		fieldOption: "",
		createdTime: null
    };

    feedback = {
        id:null,
        text:"",
        rating: 0,
        inProgress: false
    };

    groupIds=[];

    comment = "";
   }
   
 module.exports = { asoPointsSender };