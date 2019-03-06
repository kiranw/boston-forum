const request = require('request');
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

/**
 * GET /
 * Home page.
 */
var meetingsController = require("./meetings.js")
exports.index = (req, res) => {
  const User = req.user;
  Meeting.find({"canceled":false}, function(err, found_notices) {
    if (err) {
      console.log("Error querying notices: ",err)
      return [];
    }

    livemeetings = Meeting.find({"is_live":true}).exec(function(err,livemeetings) {
      opencomments = Meeting.find({"is_open_comment":true}).exec(function(err,opencomments) {
        res.render('home', {
          title: 'Home',
          notices: found_notices,
          user: User,
          livenotices: livemeetings,
          opencomments: opencomments,
        });
      });
    });
  })
};