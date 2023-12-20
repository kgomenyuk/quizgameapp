# Bot setup documentation

# Introduction

Quiz automation bot is created to automate the process of conducting and participation of students in learning quizzes.

# Prerequisites

- VS Code installed
- MongoDB installed
- MongoDB Compass installed

# Step 1

Clone bot repository on to your machine. Type in terminal:

```bash
git clone [https://github.com/kgomenyuk/quizgameapp.git](https://github.com/kgomenyuk/quizgameapp.git)
```

Open this project via VS Code.

In the terminal inside the cloned project run the following command in order to get all project dependencies:

```bash
npm install
```

# Step 2

Create your own telegram bot via @BotFather in Telegram. 

Follow instructions there - at the end of the process you will have the link and the API key of the bot which will be used further.

![Untitled](https://github.com/kgomenyuk/quizgameapp/assets/58792341/8a33e197-4095-4494-b038-8da4a6b31642)

# Step 3

Setting up the environment.

There should be 2 .env files in the cloned project, you should fill them with your data.

- quizgameapp/launch/.env(.pman)
    - delete .pman from the file name
    - RUN_BOT=[name of the bot]
- create .env in folder ‘quizgameapp’
    - DB=mongodb://localhost:27017/appquiz
    - RUN_BOT=[name of the bot]

Save all your changes.

# Step 4

Create a new empty folder for DB storage in your Documents folder on your machine.

# Step 5

Start your MongoDB server with the following command:

```bash
mongod --port 27017 --dbpath PathToTheNewFolder
```

# Step 6

Connect to the database in MongoDB Compass by default connection string

<img width="788" alt="Untitled 1" src="https://github.com/kgomenyuk/quizgameapp/assets/58792341/22ec5c3e-661a-4275-bb67-ebd8d2e74d83">

Once you are connected there should be DB called ‘appquiz’.

If there is no such DB, run sample_bots_002.js → reconnect → refresh databases

<img width="330" alt="Untitled 2" src="https://github.com/kgomenyuk/quizgameapp/assets/58792341/cd4b339f-4df0-4c97-9ff1-ff8fbd7ad32e">

# Step 7

Open ‘appquiz.bots’ collection and change fields with suitable values

- **botCode**:"[name of the bot]"
- **apiKey**:"[API key of your created bot from Step 2]"
- **isOnline**:true

Save all your changes.

# Step 8

Add part of the code to quizgameapp/launch/main_quizgame.js.

Insert this code block:

```jsx
{
    alias: "sf",
    newInstance: () => {
        var app = new AppSurveyFields();
        //app.startCommand = "me";
        //app.filterGroupId = "2";
        //app.availableSurveyCodes = ["studInfo"];
        //app.refCode = "cloud";
        return app;
    }
},
{
    alias: "grcloud",
    newInstance: () => {
        var app = new AppPointsSender();
        app.refCode = "cloud";
        return app;
    }
}];
```

Don’t forget about putting brackets correctly!

# Step 9

Add some data to MongoDB collections.

Do it one by one with this option:

<img width="301" alt="Untitled 3" src="https://github.com/kgomenyuk/quizgameapp/assets/58792341/a56ea231-a459-44b4-8325-6ae1c65071d6">

Add this data to app_settings collection:

```json
{
  "_id": {
    "$oid": "6524606ea38fd688b1325d25"
  },
  "appAlias": "sf",
  "settings": [
    {
      "propertyName": "filterGroupId",
      "propertyValue": "",
      "_id": {
        "$oid": "64a08d1ace851b46a2b6e559"
      }
    },
    {
      "propertyName": "startCommand",
      "propertyValue": "me"
    },
    {
      "propertyName": "availableSurveyCodes",
      "propertyArray": [
        "studInfo"
      ]
    },
    {
      "propertyName": "refCode",
      "propertyValue": "cloud"
    },
    {
      "propertyName": "adminStartCommand",
      "propertyValue": "srvadmin"
    }
  ]
}
```

And then add this data:

```json
{
  "_id": {
    "$oid": "652b0aaca38fd688b1325d49"
  },
  "appAlias": "grcloud",
  "settings": [
    {
      "propertyName": "startCommand",
      "propertyValue": "listgrades"
    },
    {
      "propertyName": "refCode",
      "propertyValue": "cloud"
    }
  ]
}
```

# Step 10

Also add this data to survey_fields collection in MongoDB:

```json
survey_settings:
{
  "_id": {
    "$oid": "650700aa35d8bb861118711a"
  },
  "surveyCode": "studInfo",
  "rewriteAnswers": "true",
  "refCode": "cloud",
  "description": {
    "en": "Contacts",
    "ru": "Контактные данные"
  },
  "active": "true",
  "surveyFields": [
    {
      "fieldCode": "fname",
      "fieldDescription": {
        "ru": "Введите имя",
        "en": "Enter your first name"
      },
      "fieldType": "message",
      "position": 1
    },
    {
      "fieldCode": "lname",
      "fieldDescription": {
        "ru": "Введите фамилию",
        "en": "Enter your last name"
      },
      "fieldType": "message",
      "position": 2
    },
    {
      "fieldCode": "email",
      "fieldDescription": {
        "ru": "Введите EMail",
        "en": "Enter your EMail"
      },
      "fieldType": "message",
      "position": 3
    },
    {
      "fieldCode": "vkc",
      "fieldDescription": {
        "ru": "Вы создали учетную запись и проект в VK Cloud?",
        "en": "Do you have an account and a project in VK Cloud?"
      },
      "fieldType": "choice",
      "fieldOptions": [
        {
          "code": "yes",
          "text": {
            "en": "Yes",
            "ru": "Да"
          }
        },
        {
          "code": "no",
          "text": {
            "en": "No",
            "ru": "Нет"
          }
        }
      ],
      "position": 4
    },
    {
      "fieldCode": "pcplatform",
      "fieldDescription": {
        "ru": "Каким компьютером вы пользуетесь?",
        "en": "What computer do you use?"
      },
      "fieldType": "choice",
      "fieldOptions": [
        {
          "code": "mac",
          "text": {
            "en": "Mac Intel",
            "ru": "Mac Intel"
          }
        },
        {
          "code": "macs",
          "text": {
            "en": "Mac Apple Silicon",
            "ru": "Mac Apple Silicon"
          }
        },
        {
          "code": "pc",
          "text": {
            "en": "Windows",
            "ru": "Windows"
          }
        },
        {
          "code": "pca",
          "text": {
            "en": "Windows 11 ARM",
            "ru": "Windows 11 ARM"
          }
        },
        {
          "code": "lin",
          "text": {
            "en": "Linux",
            "ru": "Linux"
          }
        }
      ],
      "position": 5
    },
    {
      "fieldCode": "botgrades",
      "fieldDescription": {
        "ru": "Хотели ли бы вы получать оценки через интерфейс чат-бота?",
        "en": "Would you like to receive the marks via this chat bot?"
      },
      "fieldType": "choice",
      "fieldOptions": [
        {
          "code": "yes",
          "text": {
            "en": "Yes",
            "ru": "Да"
          }
        },
        {
          "code": "no",
          "text": {
            "en": "No",
            "ru": "Нет"
          }
        }
      ],
      "position": 6
    }
  ]
}
```

# Step 11

Run server.js file via VS Code, the output should be the following:

![Untitled 4](https://github.com/kgomenyuk/quizgameapp/assets/58792341/8c1d571f-09ed-4c22-a6fe-5addf1ef878d)

# Step 12

Then you should add your made earlier telegram bot to any group chat in Telegram.

After that type some commands to the bot:

```bash
/srvpoints [10 last symbols of the API key]
/srvadmin [4 last symbols of the API key]
```

They are needed to register bot in the group in which you have added it.

After executing both commands always choose upper option:

<img width="336" alt="Untitled 5" src="https://github.com/kgomenyuk/quizgameapp/assets/58792341/c2aff8b7-ee4f-446d-8af3-3b2265570fa3">

# Step 13

Voila! 🥳

Now you can use the bot :)
