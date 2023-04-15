const { getDb, startDb } = require("./db");
const { MQuiz, MGameResult, MQuizPlan } = require("./model");
const fs = require('fs');
const { Binary } = require("mongodb");


// write some sample data into the database
async function writeData(){
    await startDb();
    var c = getDb();
    var resQuizzes = await MQuiz.bulkWrite([
        { updateOne:{
            filter:{ quizId: "SQL_L7_R1Q1", tags:"samples"},
            upsert:true,
            update: {
            quizId: "SQL_L7_R1Q1", 
            questionText: `What will this query return?
SELECT * FROM A LEFT JOIN B ON 1 = 0`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"Nothing, if A is empty"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"Cross product of A and B"
                },
                {
                    optionId: 3,
                    isCorrect:false,
                    text:"Nothing, if B is empty"
                }]
            }
            }
        },
        { updateOne:{
            filter:{ quizId: "SQL_L7_R1Q2", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R1Q2", 
            questionText: `Which query is equivalent to SELECT * from A cross join B?`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"SELECT * from A join B on 0 = 0"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"SELECT * from A join B on 1 = 0"
                },
                {
                    optionId: 3,
                    isCorrect:false,
                    text:"SELECT * from A, B where 0 = 1"
                }]
            }
        }
        },
        { updateOne:{
            filter:{ quizId: "SQL_L7_R1Q3", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R1Q3", 
            questionText: `Let X be number of records in A, Y - records of B and 
Z - size of A join B. 
Choose possible combinations of X, Y and Z`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:false,
                    text:"X: 5, Y: 10, Z: 60"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"X: 5, Y: 10, Z: 55"
                },
                {
                    optionId: 3,
                    isCorrect:true,
                    text:"X: 5, Y: 10, Z: 4"
                }]
            }
        }
        },
        { updateOne:{
            filter:{ quizId: "SQL_L7_R1Q4", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R1Q4", 
            questionText: `Let X be number of records in A, Y - records of B and 
Z - size of A left join B. 
Choose wrong combinations of X, Y and Z`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"X: 2, Y: 5, Z: 0"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"X: 2, Y: 5, Z: 10"
                },
                {
                    optionId: 3,
                    isCorrect:false,
                    text:"X: 2, Y: 5, Z: 2"
                }]
            }
        }
        },
        { updateOne:{
            filter:{ quizId: "SQL_L7_R2Q1", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R2Q1", 
            questionText: `What is CASE in SQL?`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:false,
                    text:"A mandatory keyword in FROM"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"A special condition in WHERE"
                },
                {
                    optionId: 3,
                    isCorrect:true,
                    text:"A conditional operator"
                }]
            }
        }
        },
        { updateOne:{
            filter:{ quizId: "SQL_L7_R2Q2", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R2Q2", 
            questionText: `Which expression can return NULL?`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:false,
                    text:"Coalesce(col1, 100)"
                },
                {
                    optionId: 2,
                    isCorrect:true,
                    text:"Case col1 when 20 then 100 end"
                },
                {
                    optionId: 3,
                    isCorrect:false,
                    text:"Case when col1 IS NULL then 100 else 1500 end"
                }]
            }
        }
        }, { updateOne:{
            filter:{ quizId: "SQL_L7_R2Q3", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R2Q3", 
            questionText: `Which query will calculate correct number of rentals of each car (group by is not shown here)?`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"SELECT count(res.cid), cid FROM res RIGHT JOIN car on res.cid = car.cid …"
                },
                {
                    optionId: 2,
                    isCorrect:false,
                    text:"SELECT count(*), cid FROM res RIGHT JOIN car on res.cid = car.cid …"
                }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R3Q1", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R3Q1", 
            questionText: `What is the difference between WHERE and HAVING?`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:false,
                    text:"Aggregation functions can be included in WHERE"
                },
                {
                    optionId: 2,
                    isCorrect:true,
                    text:"Aggregation functions can be included in HAVING"
                }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R3Q2", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R3Q2", 
            questionText: `Find a mistake in the query:
Select a, b, avg(c) from tab group by a`,
            tags:["samples"],
            options:[
                {
                    optionId: 1,
                    isCorrect:false,
                    text:"AVG is not an aggregation function"
                },{
                    optionId: 2,
                    isCorrect:false,
                    text:"c must be in GROUP BY"
                },{
                    optionId: 3,
                    isCorrect:true,
                    text:"b must be in GROUP BY"
                },{
                    optionId: 4,
                    isCorrect:false,
                    text:"avg( c ) must be in GROUP BY"
            }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R3Q3", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R3Q3", 
            questionText: `Which query can be used to prepare the table shown in the picture?`,
            image: fs.readFileSync("data/media/sample_001/img_r3q3.png"),
            hasMedia: true,
            tags:["samples"],
            
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"Select did DriverID, count(case when clsid='A' then 1 end) ClassA, count(case when clsid='B' then 1 end) ClassB …"
                },{
                    optionId: 2,
                    isCorrect:false,
                    text:"Select did DriverID, count(*) ClassA, count(*) ClassB …"
                },{
                    optionId: 3,
                    isCorrect:false,
                    text:"Select did DriverID, count(case clsid when 'A' then 1 when 'B' then 2 end) Class …"
                }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R4Q1", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R4Q1", 
            questionText: `Can anti-join in SQL be written without JOIN?`,
            hasMedia: false,
            tags:["samples"],
            
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"Yes"
                },{
                    optionId: 2,
                    isCorrect:false,
                    text:"No"
                }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R4Q2", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R4Q2", 
            questionText: `Can one write an aggregation query without GROUP BY?`,
            hasMedia: false,
            tags:["samples"],
            
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"Yes"
                },{
                    optionId: 2,
                    isCorrect:false,
                    text:"No"
                }]
            }
        }
        },{ updateOne:{
            filter:{ quizId: "SQL_L7_R4Q3", tags:"samples" },
            upsert:true,
            update: {
            quizId: "SQL_L7_R4Q3", 
            questionText: `Consider a table in the picture. Let COUNTRY be a table with two columns - continent and country name. 
The table above is a report based on COUNTRY relation. 
Which function of SQL was used to form the countries column?`,
            image: fs.readFileSync("data/media/sample_001/img_r4q3.png"),
            hasMedia: true,
            tags:["samples"],
            
            options:[
                {
                    optionId: 1,
                    isCorrect:true,
                    text:"Aggregation"
                },{
                    optionId: 2,
                    isCorrect:false,
                    text:"Sorting"
                },{
                    optionId: 3,
                    isCorrect:false,
                    text:"Filtering"
                }]
            }
        }
        },
    ]);


    var resSequence = await MQuizPlan.bulkWrite([
        { updateOne: {
            filter: { planId: "SQL_L7_Quiz" },
            upsert: true,
            update: {
            planId: "SQL_L7_Quiz", 
                quizSections:[
                    {
                        position: 1,
                        sectionId: "Round 1",
                        quizData:[
                            {
                                quizId:"SQL_L7_R1Q1",
                                position:1
                            },
                            {
                                quizId:"SQL_L7_R1Q2",
                                position:2
                            },
                            {
                                quizId:"SQL_L7_R1Q3",
                                position:3
                            },
                            {
                                quizId:"SQL_L7_R1Q4",
                                position:4
                            }
                        ]
                    },{
                        position: 2,
                        sectionId: "Round 2",
                        quizData:[
                            {
                                quizId:"SQL_L7_R2Q1",
                                position:1
                            },
                            {
                                quizId:"SQL_L7_R2Q2",
                                position:2
                            },
                            {
                                quizId:"SQL_L7_R2Q3",
                                position:3
                            },
                        ]
                    }, {
                        position: 3,
                        sectionId: "Round 3",
                        quizData:[
                            {
                                quizId:"SQL_L7_R3Q1",
                                position:1
                            },
                            {
                                quizId:"SQL_L7_R3Q2",
                                position:2
                            },
                            {
                                quizId:"SQL_L7_R3Q3",
                                position:3
                            },
                        ]
                    }, {
                        position: 3,
                        sectionId: "Round 4",
                        quizData:[
                            {
                                quizId:"SQL_L7_R4Q1",
                                position:1
                            },
                            {
                                quizId:"SQL_L7_R4Q2",
                                position:2
                            },
                            {
                                quizId:"SQL_L7_R4Q3",
                                position:3
                            },
                        ]
                    }
                ]
            }
        }
    }
    ]);
}

module.exports={
    writeData
}