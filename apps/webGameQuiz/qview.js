/**
 * Question view with web socket
 */

// current state of a quiz game
var express = require("express");
var router = express.Router();
var db = require("../../data/db");
const qrcode = require('qrpng');


/** The page will show current state of a game instance giid */
router.get("/game_view/:giid", async (req, res) => {
    try{
        // var userId = req.user.id;
        var giid = req.params.giid;
        const botInfo = req.appCore.botInfo;
        const data = await db.getGameInstanceHeader(giid);
        
        res.render("game_view", { title: data.title, instance: giid });
      } catch(err){
        res.status(500).end(); 
      }
  });



  module.exports = router;

