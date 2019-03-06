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

  Meeting.find({"canceled":false}, function(err, found_notices) {
    if (err) {
      console.log("Error querying notices: ",err)
      return [];
    }

    isCouncilor = checkCouncilorRole(res, req.user);
    Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
      livemeetings = Meeting.find({"is_live":true}).exec(function(err,livemeetings) {
        opencomments = Meeting.find({"is_open_comment":true}).exec(function(err,opencomments) {
          res.render('home', {
            title: 'Home',
            notices: found_notices,
            user: User,
            livenotices: livemeetings,
            opencomments: opencomments,
            iscouncilor: isCouncilorBoolean
          });
        });
      });
    });
  })
};



// Check if a user is a councilor
async function checkCouncilorRole(res, user){      
  if (!user){
    return false;
  }
  emailString = user.email
  var councilorPromise = () => {
    return new Promise((resolve, reject) => {
      Users.findOne({email: emailString}).exec(function(err, user){
        console.log(user.roles.includes("councilor"));
        return user.roles.includes("councilor");    
      });
    });
  };
  return councilorPromise;
}