const request = require('request');
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

/**
 * GET /
 * Home page.
 */
var meetingsController = require("./meetings.js")
exports.index = (req, res) => {
  Meeting.find({"canceled":false}, function(err, found_notices) {
    if (err) {
      console.log("Error querying notices: ",err)
      return [];
    }
    res.render('home', {
      title: 'Home',
      notices: found_notices
    });
  })
};