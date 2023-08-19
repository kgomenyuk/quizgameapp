/**
 * tg://resolve?domain=" + botInfo.userName + "&start=" + item.planId
 */
// all quiz plans available
var express = require("express");
var router = express.Router();
var db = require("../../data/db");
const qrcode = require('qrpng');



router.get("/players/:giid", async (req, res) => {
    try{
        // var userId = req.user.id;
        var giid = req.params.giid;
        const botInfo = req.appCore.botInfo;
        const data = await db.getGameInstanceHeader(giid);
        const uint8array = qrcode('tg://resolve?domain=' + botInfo.userName + "&start=C-gm2-play2-" + data._id);
        const qrc = 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, uint8array));
        res.render("game_play_qrc", { title: data.title, qrc: qrc });
      } catch(err){
        res.status(500).end(); 
      }
  });



  module.exports = router;