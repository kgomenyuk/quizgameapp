# AppPointsSender documentation

Points Sender is an application designed to manage student grades.

## Functions for students

### 1. Viewing grades

In order to display a list of their current grades, students should use the `/mypoints` command
![Alt text](image.png)

## Functions for administrator

### 1. Add Grade Category

In order to add a new grade group, the administrator needs to use the `/listgrades` command. 
![Alt text](image-1.png)
Then it is suggested to either add a new grade, delete existing grades or reload the audience
If the administrator chooses to add a new category of grades, a corresponding message will appear, which must be answered with a text with the name of the grade group, after which it will be stored in the database in the appquiz table. `.points_cats`
For example, a teacher has given a test and wants to grade it, so he needs to create the Test group of grades
![Alt text](image-3.png)

### 2. Post Grades

To add a grade to a student, you need to use the `/addpoints` command, after which the bot will ask you to select the required grade group, the student and the grade itself on a 10-point scale.
![Alt text](image-4.png)

If a teacher wants to add grades to several people at once, use the `/bulkpoints` command, specifying the `userID` and the student's grade (between UserId and mark needs doublespace). To add another student, use a line break with `/n`. Next, the bot will ask you to select a grade category.
![Alt text](image-5.png)
