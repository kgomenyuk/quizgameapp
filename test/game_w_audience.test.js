const { Game } = require("../game");
const { Quiz } = require("../quiz");

test('Options can be added to the quiz. Shuffling function works.', () => { 
   const quiz = new Quiz();
   quiz.setText("What is the size of record set returned by A cross join B if A nd B contain 10 records each?");
   // add three options
   quiz.addOption("10", false);
   quiz.addOption("100", false);
   quiz.addOption("20", false);

   // there should be 3
   const options = quiz.getOptions();

   expect(options).toHaveLength(3);

   // let's shuffle the options
   const o1 = quiz.getOptions()[0].id;
   quiz.shuffleOptions();
   const o2 = quiz.getOptions()[0].id;
   quiz.shuffleOptions();
   const o3 = quiz.getOptions()[0].id;

   expect(o1!=o2 || o1!=o3 || o2!=o3).toBe(true);

 });

 test('The quiz starting time is recorded', async () => { 
    
   const quiz = new Quiz();
   quiz.setText("What is the size of record set returned by A cross join B if A and B contain 10 records each?");
   // add three options
   quiz.addOption("10", false);
   quiz.addOption("100", false);
   quiz.addOption("20", true);

   quiz.setQuestionStart();

   // player 1 posted
   quiz.postAnswer("User 1", 2);

   expect(quiz.isStarted).toBe(true);

 });


 test('Answers from users are recorded with timestamps', async () => { 
    
   const quiz = new Quiz();
   quiz.setText("What is the size of record set returned by A cross join B if A and B contain 10 records each?");
   // add three options
   quiz.addOption("10", false);
   quiz.addOption("100", false);
   quiz.addOption("20", true);

   quiz.setQuestionStart();

   // player posted
   var a1 = quiz.postAnswer("User 1", 2);
   
   await new Promise((x)=>{
      setTimeout(x, 1000);
      console.log("!!");
   });

   var a2 = quiz.postAnswer("User 2", 3);

   expect(a1.time.getMilliseconds()).toBeLessThan(a2.time.getMilliseconds());

   
 });
 
 