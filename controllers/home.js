const request = require('request');
const mongoose = require('mongoose');
const User = require('../models/User')
const Meeting = require('../models/Meeting');

/**
 * GET /
 * Home page.
 */
var meetingsController = require("./meetings.js")
exports.index = async (req, res) => {
  const User = req.user;
  var options = { year: 'numeric', month: 'long', day: 'numeric' };
  todayString = new Date().toLocaleDateString('en-US', options);

  Meeting.find({"canceled":false}).populate("topics").populate("live_comments").exec(function(err, found_notices) {
    if (err) {
      console.log("Error querying notices: ",err)
      return [];
    }

    councilorPromise = checkCouncilorRole(res, req.user)
    Promise.resolve(councilorPromise).then(function(isCouncilorBoolean){
      Meeting.find({is_live:true}).populate("topics").populate("live_comments").exec(function(err, live_meetings) {
        live_meetings.forEach(function(m){
          if (m.notice_date != todayString) {
            m.is_live = false;
            m.save();
          }
        });
        Meeting.find({notice_date: todayString}).populate("live_comments").populate("topics").exec(function(err,todaysMeetings) {
         todaysMeetings.forEach(function(m){
            if (!m.is_live) {
              m.is_live = true;
              m.save();
            }
          }); 
          opencomments = Meeting.find({"is_open_comment":true,is_archived:true}).populate("live_comments").populate("topics").exec(function(err,opencomments) {
            res.render('home', {
              title: 'Home',
              notices: found_notices,
              user: User,
              livemeetings: todaysMeetings,
              opencomments: opencomments,
              iscouncilor: isCouncilorBoolean
            });
          });
        });
      });
    });
  })
};



// Check if a user is a councilor
function checkCouncilorRole(res, user){   
  if (!user){
    return new Promise((resolve,reject) => {
      resolve(false);
    }); 
  }
  else {
    emailString = user.email
    return new Promise((resolve, reject) => {
      User.findOne({email: emailString}).exec(function(err, user){
        if (err) {
          console.log("ERROR IN CHECKING COUNCILOR")
          resolve(false);
        }
        else {
          console.log("IS A COUNCILOR: ",user.roles.includes("councilor"));
          resolve(user.roles.includes("councilor"));
        }
      });
    });
  }
}