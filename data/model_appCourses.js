var m = require("mongoose");

/*        SCHEMAS        */

const CCourse = new m.Schema(
    {
        courseName: String, // unique key
        courseNumber: Number    
    }
);
// quiz id now will be unique
CCourse.index({courseNumber: 1}, {unique: true});

/*        MODELS        */

// a single question
const MCourse = m.model("mg_course", CCourse);
const CStudent = new m.Schema(
    {
        studentName: String, // unique key
        courseName: String,    
        studentNumber: Number
    }
);
// quiz id now will be unique
CStudent.index({studentNumber: 1}, {unique: true});
const MStudent = m.model("mg_student", CStudent);
module.exports = {
    MCourse, MStudent
}
   