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

module.exports = {
    MCourse
}
   