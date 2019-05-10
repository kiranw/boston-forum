const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')
const mongoose = require('mongoose');
const Users = require('../models/User');
const Tag = require('../models/Tag');

/**
 * GET /tags/all-tags
  Get open comment period issues
 */
exports.getAllTags = async (req, res, next) => {
  user = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Tag.find({}).exec(function(err, tags){
      if (user) {
        Users.findOne({email: req.user.email}).populate({path: 'topics'}).exec( function(err, userFull) {
          res.render('tags/all-tags', {
              title: 'All Tags',
              user: user,
              fullUser: userFull,
              iscouncilor: isCouncilorBoolean,
              tags: tags
          });  
        });  
      } else {
        res.render('tags/all-tags', {
            title: 'All Tags',
            user: user,
            fullUser: user,
            iscouncilor: isCouncilorBoolean,
            tags: tags
        });  
      }
    });
  });
}


/**
  For the GET /tags/get-tags-autocomplete AJAX request
  search bar suggestions
*/
exports.getTagsAutocomplete = async (req, res) => {
  Tag.find({}).exec(function(err, tags){
      res.send(JSON.stringify(tags), 
        {'Content-Type': 'application/json'},
        200)
  });  
}

/**
 * POST /tags/create
  Create a new topic
 */
exports.create = async (res, req) => {
  const user = req.user;
  console.log(req.body)
  var newTopic = req.body["new-topic-name"];
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    if (isCouncilorBoolean) {
        Tag.findOne({"title": newTopic}).exec(function(err, tag){
            if (!tag) {
                newTag = {}
                newTag["title"] = newTopic;
                (new Tag(newTag)).save();
            }
        });
        req.flash('success', {msg: "Success! Your new topic was added."})
        res.redirect('/tags/all-tags/');    
    }
    else {
        req.flash('error', {msg: "You're account does not support the creation of new topics - if this looks like a mistake, please contact kwattamwar@mde.harvard.edu."})
        res.redirect('/tags/all-tags/');    
    }
  });
}


/**
  For the GET /tags/get-linked-notices/:title AJAX request
  when a tag is selected, send the related tags to the page
*/
exports.getLinkedNotices = async (res, req) => {
  user = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    var topicTitle = req.params.title.replace("escapedSlash","/");
    Tag.find({"title":topicTitle}).populate("linkedNotices").exec(function(err, tag){
        response = {
          "tag": tag[0],
          "user": user,
          "iscouncilor": isCouncilor 
        };
        res.send(JSON.stringify(response), 
          {'Content-Type': 'application/json'},
          200);
    });
  });
}





/**
 * GET /tags/follow-tag/:title
   Subscribe to updates on a topic
 */
exports.followTag = async (req, res, next) => {
  title = req.params["title"];
  console.log("title",title);

  Tag.findOne({"title": title}).populate("linkedNotices").exec(function (err, subscribed_tag) {
    if (err) {
      console.log("Error subscribing to topic with id: ", assigned_id, "with Error:",err)
    }

    console.log("subs",subscribed_tag);

    Users.findOne({email: req.user.email}).populate('topics').exec(function(err, matchingUser){
      matchingUser.topics.pushIfNotExist(subscribed_tag, function(e) { 
        if (e) {
          return e.title === subscribed_tag.title;
        }
        return false;
      });
      matchingUser.save();
    })
  });
  req.flash('success', { msg: 'Success! You just subscribed to a topic.'});
  res.redirect('/account/tag-subscriptions/');
}





/**
 * GET /meetings/unfollow-tag/:title
   Unsubscribe to updates on a topic
 */
exports.unfollowTag = async (req, res, next) => {
  title = req.params["title"];

  Tag.findOne({"title": title}, function (err, subscribed_tag) {
    if (err) {
      console.log("Error subscribing to meeting with id: ", title, "with Error:",err)
    }

    Users.findOne({email: req.user.email}).populate('topics').exec(function(err, matchingUser){
      matchingUser.topics.splice( 
        matchingUser.topics.indexOf( 
          matchingUser.topics.filter( function(e) { 
            return e.title === title;
      })));
      matchingUser.save();
    })
  });
  req.flash('success', { msg: 'Success! You just unfollowed a topic.'});
  res.redirect('/account/tag-subscriptions/');
}














// HELPERS

// check if an element exists in array using a comparer function
// comparer : function(currentElement)
Array.prototype.inArray = function(comparer) { 
    for(var i=0; i < this.length; i++) { 
        if(comparer(this[i])) return true; 
    }
    return false; 
}; 

// adds an element to the array if it does not already exist using a comparer 
// function
Array.prototype.pushIfNotExist = function(element, comparer) { 
    if (!this.inArray(comparer)) {
        this.push(element);
        return true;
    }
    return false;
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