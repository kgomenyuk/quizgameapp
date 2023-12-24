# AppSurveyFields documentation

Survey Fields is an application designed to conduct surveys among students.

## Basic functionality

In order for a user to access the polls menu, the `/me` command must be entered. After that, a menu will appear with a choice of the language of the survey.

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/6634f2f6-bf75-408c-9893-9d830eac928d)

After selecting the language, the user is prompted to choose one of the available surveys. All surveys are stored in the database in the `appquiz.survey_fields` table.

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/1a19dc97-a973-402b-a1d6-602a5434d2cd)

The user is then sequentially shown questions to be answered either by a message:

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/c22950c4-e1a2-4d9b-bbf6-37e7829f341e)

Or by selecting the desired option with the button:

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/d35760c9-56d5-4e7a-963b-1745ab2e9738)

There are also three buttons in each question: ⏏️ to close and cancel the survey, ⏩ to skip the current question and go to the next one and ⬅️ to return to the previous question.

When the survey is complete, a message is shown to the user

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/353e193f-14b9-4959-b393-5aed115be300)

And all answers are written to the `appquiz.survey_fields_answers` table in the database
