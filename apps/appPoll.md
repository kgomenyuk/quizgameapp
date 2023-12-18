# Poll application documentation
## Basic functions
### Create poll
Command `/poll_c {question}?{anser1};{answer2};...;{anser N}` creates new poll. Add `*` sumbol before answer to make answer correct.
For each created poll generates unqiue code that can be accessed in `/poll_lst` command
### List active polls
Command `/poll_lst` return all active polls. For each active poll command print poll question and poll code.

### Finish poll
Threre are two ways to finish poll
1. Reply to poll with `/poll_f` command.
2. Call  `/poll_f [poll_id...]` command with coma separeted poll ids from `/poll_lst` command.
Poll can be finished only by poll creator.

### Get leaderboard
Command `/poll_lb` prints poll participant scores (number of correct answers).

# Other
- Application has two modes - everyone in chat can create polls and list polls or only application admin. This behavour can be changed in appsettings in mongodb (**pointsAdminId**-app admin Id and **checkAdmin**-requir admin access).
- Leaderboard calculates only among polls that was created in chat there leaderboard was called.