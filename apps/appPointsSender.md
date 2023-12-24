# AppPointsSender documentation

Points Sender is an application designed to manage student grades.
## Table of Contents
[Functions for students](#stud)

## Functions for students

### 1. Viewing grades <a name="stud"></a> 

In order to display a list of their current grades, students should use the `/mypoints` command

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/5cc4cbcd-af69-4a25-a0d5-1daa1572ac47)

## Functions for administrator

### 1. Add Grade Category

In order to add a new grade group, the administrator needs to use the `/listgrades` command.

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/8660a0d5-eb54-4c53-ad3f-511a4498bbed)

Then it is suggested to either add a new grade, delete existing grades or reload the audience
If the administrator chooses to add a new category of grades, a corresponding message will appear, which must be answered with a text with the name of the grade group, after which it will be stored in the database in the appquiz table. `.points_cats`

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/72880dc3-b8ae-4814-9447-d1e467ea7238)

For example, a teacher has given a test and wants to grade it, so he needs to create the Test group of grades

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/7facaf61-6b47-4a76-860f-04c9e4541cc3)

### 2. Post Grades

To add a grade to a student, you need to use the `/addpoints` command, after which the bot will ask you to select the required grade group, the student and the grade itself on a 10-point scale.

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/ff9eb2ae-67ab-44b5-9fe9-194e15912ecd)


If a teacher wants to add grades to several people at once, use the `/bulkpoints` command, specifying the `userID` and the student's grade (between UserId and mark needs doublespace). To add another student, use a line break with `/n`. Next, the bot will ask you to select a grade category.

![image](https://github.com/kgomenyuk/quizgameapp/assets/22096074/a64c1132-cff8-449e-b2cc-cf00025a0298)
