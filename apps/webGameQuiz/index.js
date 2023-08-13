// all quiz plans available
const secret = "12345abczxY&";
var jwt = require('jsonwebtoken');

var express = require("express");
const crypto = require('crypto');
var router = express.Router();

const checkSignature = ({ hash, ...userData }, botKey) => {
    // create a hash of a secret that both you and Telegram know. In this case, it is your bot token
    const secretKey = crypto
        .createHash('sha256')
        .update(botKey)
        .digest();
  
    // this is the data to be authenticated i.e. telegram user id, first_name, last_name etc.
    const dataCheckString = Object
        .keys(userData)
        .sort()
        .map(key => (`${key}=${userData[key]}`))
        .join('\n');
  
    // run a cryptographic hash function over the data to be authenticated and the secret
    const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
  
    // compare the hash that you calculate on your side (hmac) with what Telegram sends you (hash) and return the result
    return hmac === hash;
}

router.get("/start", async (req, res) => {
    try{
        
        const nonce = crypto.randomBytes(16).toString("base64");

          res
          .setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' https://telegram.org https://oauth.telegram.org/ 'nonce-"+nonce+"'")
          .send(`<html>
          <body>
          <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-login="onegamequizbot" data-size="large" data-userpic="false" data-onauth="onTelegramAuth(user)" data-request-access="write"></script>
          <script type="text/javascript" nonce="${nonce}">
            var context = {
                jsonUser: "",
                currentUser: null
            };
            function onTelegramAuth(user) {
              alert('Logged in as ' + user.first_name + ' ' + user.last_name + ' (' + user.id + (user.username ? ', @' + user.username : '') + ')');
              var link = document.getElementById('linkMyQuizCollection');

              var jsonObj = btoa(JSON.stringify(user));

              context.currentUser = user;
              context.jsonUser = jsonObj;

              link.href = 'menu/' + jsonObj;
            }
          </script>
          <br/>
          <a id='linkMyQuizCollection' href='/'+context.jsonObj>My quiz collection</a>
          </body>
          </html>`).status(200).end();
      } catch(err){
        res.status(500).json({
          result: "error",
          errorCode: 0, 
        });
      }
  });


  router.get("/menu/:data", async (req, res) => {
    try{
        const data = req.params.data;
        const payload = JSON.parse(Buffer.from(req.params.data, 'base64').toString());
        const botKey = req.app.bots[process.env["RUN_BOT"]];
        const hashIsValid = checkSignature(payload, botKey.apiKey);

        // check role of user. It must be admin.

        if(hashIsValid == true){
            // let's fill the session!
            var token = jwt.sign(
                {   
                    user: { id:payload.id, firstName:payload.first_name, lastName:payload.last_name }, 
                    userRoles: []
                },
                secret,
                { expiresIn: "7d" }
              );
            
            res.cookie('authorization', token);
            res.render("report_game_plans", {});
            res.end();
        }

      } catch(err){
        res.status(500).json({
          result: "error",
          errorCode: 0, 
        });
      }
  });


  module.exports = router;