# 1 what this bot is about?
## 1.1. First, it can be used a an offline quiz game assistant
## 1.2. The bot connects the playing teams with the game process
## 1.3. The bot calculates the results and finds winners by number of rounds won

# 2. What are the main features of the bot?
## 2.1. Game management through Telegram chat with the bot
## 2.2. Saving results of each game in a database

# 3. How can one use this bot?
## 3.1. Game initialization

# 4. Database structure
## writeData() method populates the database using the bulkWrite() method and an object called MQuiz, which represents the data model for quiz questions.

## The bulkWrite() method allows for multiple write operations to be executed in a single database transaction to ensure data integrity. Each object in the array defines a write operation, which can be adding a new record, updating an existing record, or deleting a record.

## Each object defines a filter, which is used to select the record in the database to be modified, and an update that contains new values for the fields that need to be saved in the database.

## Additionally, each object contains quizId, questionText, tags for searching questions, and answer choices with their text and an isCorrect flag indicating whether this choice is the correct answer.

## possible structure

'''

{ updateOne:{
    filter:{ quizId: "SQL_L7_R1Q2", tags:"samples" },
    upsert:true,
    update: {
    quizId: "SQL_L7_R1Q2", 
    questionText: `Which query is equivalent to SELECT * from A cross join B?`,
    tags:["samples"],
    options:[
            {
                ptionId: 1,
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
}
'''



