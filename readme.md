# 1 what this bot is about?
## 1.1. First, it can be used a an offline quiz game assistant
## 1.2. The bot connects the playing teams with the game process
## 1.3. The bot calculates the results and finds winners by number of rounds won

# 2. What are the main features of the bot?
## 2.1. Game management through Telegram chat with the bot
## 2.2. Saving results of each game in a database

# 3. How can one use this bot?
## 3.1. Game initialization
Please, use the command /ngame to create a new game. This command has the following parameters: numberOfTeams teamLimit numberOfRounds


# Database configuration
This project works with mongoDB server. The connection string can be specified in the .env file. Initially, there is no such a file. So first you should create a .env file in the project directory as a copy of sample.env file. Then change .env accordingly - initialize DB and Telegram's API_KEY variables.
1. Download MongoDB
2. Create a new folder to store the data
3. run mongod --port 27017 --dbpath PathToTheNewFolder
4. create a .env file in the project directory as a copy of sample.env file