const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')
const mongoose = require('mongoose');
const Users = require('../models/User');

/**
 * GET /tags/all-tags
  Get open comment period issues
 */
exports.getAllTags = async (req, res, next) => {
  user = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  tags = ["Waste","Taxes","Housing","Safety","Elections"]
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
      res.render('tags/all-tags', {
          title: 'All Tags',
          user: user,
          iscouncilor: isCouncilorBoolean,
          tags: tags
      });
  });
}



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
      Users.findOne({email: emailString}).exec(function(err, user){
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