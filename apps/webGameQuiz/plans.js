// all quiz plans available
var express = require("express");
var router = express.Router();
var db = require("../../data/db");

router.get("/list", async (req, res) => {
    try{
        var ownerId = req.user.id;
        const data = await db.webGameQuizReportPlans(ownerId);
        const botInfo = req.appCore.botInfo;
        res.render("report_game_plans_list", { items:data, botInfo:botInfo });
      } catch(err){
        
      }
      //res.status(200).end();
  });



  module.exports = router;