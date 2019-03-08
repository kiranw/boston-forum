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

    councilorPromise = checkCouncilorRole(res, req.user)
    Promise.resolve(councilorPromise).then(function(isCouncilorBoolean){
      livemeetings = Meeting.find({"is_live":true}).exec(function(err,livemeetings) {
        opencomments = Meeting.find({"is_open_comment":true}).exec(function(err,opencomments) {
          res.render('home', {
            title: 'Home',
            notices: found_notices,
            user: User,
            livemeetings: livemeetings,
            opencomments: opencomments,
            iscouncilor: isCouncilorBoolean
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