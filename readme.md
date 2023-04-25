# **Quiz automation bot user guide.**

# **Table of contents**

[Introduction 1](#_Toc132642883)

[Database configuration 2](#_Toc132642884)

[Starting the bot 2](#_Toc132642885)

[Showing available commands 3](#_Toc132642886)

[Creating a new game/quiz 3](#_Toc132642887)

[Creating a secret code to join a game 3](#_Toc132642888)

[Registering a player in the game 3](#_Toc132642889)

[Making player a quiz master 4](#_Toc132642890)

[Making player part of the audience 4](#_Toc132642891)

[Starting the game 4](#_Toc132642892)

[Choosing team to answer the question (as a quiz master) 4](#_Toc132642893)

[Marking if the chosen team's answer is correct or not (as a quiz master) 5](#_Toc132642894)

[Finishing round and typing the results of teams (as a quiz master) 5](#_Toc132642895)

[Finishing the game and viewing the results of teams 5](#_Toc132642896)

# **Introduction**

Quiz automation bot ([https://t.me/onegamequizbot](https://t.me/onegamequizbot)) is created to automate the process of conducting and participation of students in learning quizzes. It has the following functionality:

- Starting the bot
- Showing available commands
- Creating a new game/quiz
- Creating a secret code to join a game
- Registering a player in the game
- Making player a quiz master
- Making player part of the audience
- Starting the game
- Choosing team to answer the question (as a quiz master)
- Marking if the chosen team's answer is correct or not (as a quiz master)
- Finishing round and typing the results of teams (as a quiz master)
- Finishing the game and viewing the results of teams (as a quiz master)

# **Database configuration**

This project works with mongoDB server. The connection string can be specified in the .env file. Initially, there is no such a file. So first you should create a .env file in the project directory as a copy of sample.env file. Then change .env accordingly - initialize DB and Telegram's API\_KEY variables.

1. Download MongoDB
2. Create a new folder to store the data
3. run mongod --port 27017 --dbpath PathToTheNewFolder
4. create a .env file in the project directory as a copy of sample.env file

# **Starting the bot**

User can make the bot working by passing the command "/start" to it or just pressing "Начать" in telegram mobile or desktop clients.

<img width="225" alt="image" src="https://user-images.githubusercontent.com/58792341/233375048-37c5b337-6337-4f9d-b681-a8587b3cefb6.png">

# **Showing available commands**

The user can watch through the full list of available commands of the bot by passing the command "/help".

<img width="427" alt="image" src="https://user-images.githubusercontent.com/58792341/233375157-a8cb6f57-9e5f-41df-b378-e8490d6b5a87.png">

# **Creating a new game/quiz**

The user can create a new game by passing the command "/ngame". After that action the user will be provided by informational message about how to pass the parameters of the new game to the bot.

Command "/ngame" should include parameters "Number of teams", "Team members limit", "Number of rounds". E. g., /ngame 2 3 4

<img width="420" alt="image" src="https://user-images.githubusercontent.com/58792341/233375211-307bc7d5-0eed-4385-b63c-71c150484471.png">

# **Creating a secret code to join a game**

After the game is created by user, bot will automatically pass the secret code to the game creator in order to all participants can join the game. E. g.:

<img width="188" alt="image" src="https://user-images.githubusercontent.com/58792341/233375263-668524ed-6b5b-4b8e-b0bd-088142dc4023.png">

# **Registering a player in the game**

When game code is given, all players can join the game using command "/play" by passing this command and the secret code provided above. E. g., /play mifCV

# **Making player a quiz master**

When game code is given, one player needs to be assigned as quiz master. He can do it by passing the command "/control" with the secret code given above. E. g., /control mifCV.

After this action other users will get the message asking them to confirm or reject that this player will be the quiz master.

<img width="383" alt="image" src="https://user-images.githubusercontent.com/58792341/233375333-99785063-5f5e-4841-acc1-dc6342f508e3.png">

# **Making player part of the audience**

**TBD LATER**

# **Starting the game**

After all roles are assigned and confirmed, the game can be started by clicking "Start!" in the informational message from the bot.

<img width="232" alt="image" src="https://user-images.githubusercontent.com/58792341/233375379-6dc46cd5-a052-49c8-8e08-364028dd49fe.png">

# **Choosing team to answer the question (as a quiz master)**

After the game started, quiz master should choose which team should answer the question.

**Warning** – bot functionality does not involve storing the texts of questions, answer choices and their correctness/incorrectness. all questions and answers are displayed and entered outside the bot environment.

<img width="136" alt="image" src="https://user-images.githubusercontent.com/58792341/233375423-56a4a9cb-146f-4229-ac25-41dde803abaf.png">

# **Marking if the chosen team's answer is correct or not (as a quiz master)**

Quiz master, after he got the answer from the chosen team, should mark if the answer is correct or not and then move on to the next question clicking on informational message.

<img width="126" alt="image" src="https://user-images.githubusercontent.com/58792341/233375449-42ce92f7-5b5f-4f39-9d77-25e6840f9e82.png">

# **Finishing round and typing the results of teams (as a quiz master)**

Quiz master can finish round by clicking "Finish round" in the informational message in the bot.

After that action bot will provide the message with teams' statistics after the round.

<img width="108" alt="image" src="https://user-images.githubusercontent.com/58792341/233375476-d9e44969-605a-4f19-8491-f9219781185c.png">

# **Finishing the game and viewing the results of teams**

After all rounds are played and answers are given, quiz master can finish the game by clicking on "Finish game" in the informational message sent by bot.

After this action bot will send the statistics about finished round, about full game teams' performance and about who won the game.

<img width="114" alt="image" src="https://user-images.githubusercontent.com/58792341/233375497-ffd6a07b-24c6-4e4b-a9d2-6dd8a471576d.png">


# Database structure
### writeData() method populates the database using the bulkWrite() method and an object called MQuiz, which represents the data model for quiz questions.

### The bulkWrite() method allows for multiple write operations to be executed in a single database transaction to ensure data integrity. Each object in the array defines a write operation, which can be adding a new record, updating an existing record, or deleting a record.

### Each object defines a filter, which is used to select the record in the database to be modified, and an update that contains new values for the fields that need to be saved in the database.

### Additionally, each object contains quizId, questionText, tags for searching questions, and answer choices with their text and an isCorrect flag indicating whether this choice is the correct answer.

### possible structure

```js script
updateOne:{
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
```
