const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Users = require('../models/User');
const LiveComment = require('../models/LiveComment');
const OpenComment = require('../models/OpenComment');


/**
 * GET /meetings/download-ics/:event
  Download calendar file for a public notice event
 */
exports.downloadIcs = (res, params) => {
  res.download(params.event);
};


exports.prepareIcs = (event, eventId) =>{
  ics.createEvent(event, (error, value) => {
      if (error) {
        console.log(error)
        return;
      }
      writeFileSync('Boston_Public_Notice_'+eventId+'.ics', value);
  })
  return 'Boston_Public_Notice_'+eventId+'.ics';
}


/**
 * GET /meetings/public-notices
  Boston public notices
 */
exports.getPublicNotices = async (req, res, next) => {

  request.get({ url: 'https://www.boston.gov/api/v2/public-notices' }, (err, request, body) => {
    if (err) { return next(err); }
    if (request.statusCode >= 400) {
      return next(new Error(`Boston Government API - ${body}`));
    }
    var notices = JSON.parse(JSON.parse(JSON.stringify(body)));

    // get existing notices from db
    // get Boston API notices
    // if API notice not already in db (check by unique id field), then clean, add to list, and add to db
    
    var notices_cleaned = notices.map(function(n){
      n["url"] = "https://www.boston.gov" + n.title.match(/\<a href\=\"(.*?)\"\>/)[1];
      n["title"] = n.title.match(/\>(.*?)\</)[1];
      n["body"] = n.body.replace(/(\<.*?\>)/g, "");
      n["canceled"] = n.canceled==1;
      n["assigned_id"] = n.id;
      n["ics"] = prepareIcs(prepareCalendarEvent(n), n.id);
      n["hashtags"] = ["#assembly"+n["assigned_id"]];
      delete n["id"];

      addMeetingtoDb(n);
      return n;
    }); 

    user = req.user;
    isCouncilor = checkCouncilorRole(res, req.user);
    Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
      Meeting.find({"canceled":false, "is_archived":false}, function(err, found_notices) {
        archiveOldMeetings(found_notices);
        if (err) {
          console.log("Error querying notices: ",err)
          return [];
        }
        res.render('meetings/public-notices', {
          title: 'Public Notices',
          notices: found_notices,
          user: req.user,
          iscouncilor: isCouncilorBoolean
        });
      });
    });
  });
};


/**
 * GET /meetings/open-comments
  Get open comment period issues
 */
exports.getOpenComments = async (req, res, next) => {
  user = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Meeting.find({is_open_comment:true}).exec(function(err, meetings) {
      res.render('meetings/open-comments', {
          title: 'Open Comments',
          opencomments: meetings,
          user: user,
          iscouncilor: isCouncilorBoolean
      });
    });
  });
}



/**
 * GET /meetings/live-meetings
  Get open comment period issues
 */
exports.getLiveMeetings = async (req, res, next) => {
  user = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Meeting.find({is_live:true}).exec(function(err, meetings) {
      res.render('meetings/live-meetings', {
        title: 'Live Meetings',
        livemeetings: meetings,
        user: user,
        iscouncilor: isCouncilorBoolean
      });
    });
  });
}





/**
  New Meeting Form
*/
exports.newMeeting = async (req, res, next) => {
  const unknownUser = !(req.user);
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    res.render('meetings/new-meeting', {
      title: 'New Notice',
      unknownUser,
      user: req.user,
      iscouncilor: isCouncilorBoolean
    });
  });
}


/**
  New Meeting from
  POST /meetings/edit
*/
exports.create = async (req, res, next) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    validated_meeting = {}
    validated_meeting["assigned_id"] = '_' + Math.random().toString(36).substr(2, 9)
    validated_meeting["testimony_time"] = req.body["testimony-time"];
    validated_meeting["url"] = req.body["meeting-url"] == "" ? "/meetings/error-page": req.body["meeting-url"];
    validated_meeting["title"] = req.body["meeting-title"];
    validated_meeting["location_name"] = req.body["location-name"];
    validated_meeting["location_room"] = req.body["location-room"];
    validated_meeting["location_street"] = req.body["location-street"];
    validated_meeting["canceled"] = false;
    validated_meeting["notice_date"] = req.body["notice-date"]
    validated_meeting["notice_time"] = req.body["notice-time"]
    validated_meeting["field_drawer"] = req.body["field-drawer"]
    validated_meeting["notice_body"] = req.body["field-drawer"]
    validated_meeting["posted"] = Date.now();
    validated_meeting["is_live"] = req.body["live"] == "on" ? true : false;
    validated_meeting["is_open_comment"] = req.body["open-comment"] == "on" ? true: false;
    validated_meeting["agenda_path"] = req.body["agenda-path"] == "" ? "/meetings/error-page": req.body["url"];
    validated_meeting["meeting_minutes_path"] = "/meetings/error-page";
    validated_meeting["owner"] = User;
    validated_meeting["ics"] = prepareIcs(prepareCalendarEvent(validated_meeting), validated_meeting["assigned_id"]);
    validated_meeting["hashtags"] = req.body["meeting-hashtags"].split(",") + ["#assembly"+validated_meeting["assigned_id"]];

    meeting = prepareMeetingObject(validated_meeting);
    addMeetingtoDb(meeting);

    req.flash('success', { msg: "Success! Here's the meeting you just created."});
    res.redirect('/meetings/expanded-meeting/'+validated_meeting["assigned_id"]);
  });
}


/**
  Create a live comment
  POST /meetings/create-live-comment
*/
exports.createLiveComment = async (res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    console.log(req.body);
    console.log(req.params);
    liveComment = {}

    Meeting.findOne({"assigned_id":req.params.meeting_id}).populate('live_comments').exec(function(err, meeting){
      Users.findOne({"email":req.user.email}).exec(function(err,fullUser){
        liveComment["author"] = fullUser;
        liveComment["title"] = req.body["comment-title"];
        liveComment["body"] = req.body["comment-body"];
        liveComment["isTwitter"] = false;
        liveComment["postedDate"] = Date.now();
        // liveComment["linkedLiveComments"] = [];
        // liveComment["linkedOpenComments"] = [];
        // liveComment["linkedHashtag"] = "";
        // liveComment["upvotes"] = [];
        liveComment["meeting"] = meeting;
        liveComment["showName"] = req.body["show-name"]=="on";

        addLiveCommenttoDb(liveComment, meeting);

        req.flash('success', {msg: "Success! Your comment was published."})
        res.redirect('/meetings/live-meeting/'+req.params.meeting_id);
      })
    });
  });
}




/**
  Create a live comment
  POST /meetings/create-live-subcomment/:meeting_id/:comment_id
*/
exports.createLiveSubcomment = async (res, req) => {
  meetingId = req.params.meetingId
  commentId = req.params.commentId
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    liveSubComment = {}

    LiveComment.findOne({"_id":commentId}).exec(function(err, comment){
      Users.findOne({"email":req.user.email}).exec(function(err,fullUser){


        console.log("FOUND COMMENT:",comment);
        console.log("FOUND USER:",fullUser);
        liveSubComment["author"] = fullUser;
        liveSubComment["title"] = req.body[commentId+"-subcomment-title"];
        liveSubComment["body"] = req.body[commentId+"-subcomment-body"];
        liveSubComment["isTwitter"] = false;
        liveSubComment["postedDate"] = Date.now();
        liveSubComment["showName"] = req.body[commentId+"-subcomment-show-name"]=="on";

        addLiveSubCommenttoDb(liveSubComment, comment);

        req.flash('success', {msg: "Success! Your comment was published."})
        console.log("Getting up to here");
        res.redirect('/meetings/live-meeting/'+req.params.meetingId);
      })
    });
  });
}




/**
  Render the full meeting information on a separate page
  GET /meetings/expanded-meeting/:assigned_id
// */
exports.renderExpandedMeeting = async(res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    console.log("resolved the promise");
    console.log(isCouncilor)
    console.log("RESULT:",isCouncilor.result)
    Meeting.findOne({"assigned_id": req.params.assigned_id}).populate('live_comments').exec(function(err, matching_meeting) {
      if (err) {
        console.log("Error finding meeting with id: ", req.params.assigned_id);
      }
      if (!matching_meeting) {
        console.log("Error finding newly created meeting:",err, " with assigned_id:",req.params.assigned_id);
      }
      res.render('meetings/expanded-meeting', {
        title: 'Expanded Meeting Information',
        meeting: matching_meeting,
        user: User,
        iscouncilor: isCouncilorBoolean
      });
    })
  });
}

/**
  Render the full meeting information on a separate page
  GET /meetings/live-meeting/:assigned_id
// */
exports.renderLiveMeeting = async(res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Meeting.findOne({"assigned_id": req.params.assigned_id})
      .populate({path: 'upvotes'})
      .populate({path: 'live_comments', populate: {path: 'author'}})
      .populate({path: 'live_comments', populate: {path: 'linkedLiveComments', populate: {path: 'author'}}})
      .exec(function(err, matching_meeting) {
        // test = matching_meeting.live_comments.map(function(c){
        //   // c["is_author"] = req.user ? c.author.email == req.user.email : false;
        //   c["is_upvoted"] = c.upvotes.some(function(e){
        //     e.email == req.user.email;
        //   });
        //   return c;
        // })
        // console.log(test);

        // console.log(matching_meeting.live_comments[0]);
        if (err) {
          console.log("Error finding meeting with id: ", req.params.assigned_id);
        }
        if (!matching_meeting) {
          console.log("Error finding newly created meeting:",err, " with assigned_id:",req.params.assigned_id);
        }
        if (matching_meeting.is_live){
          res.render('meetings/live-meeting', {
            title: 'Live Meeting Information',
            meeting: matching_meeting,
            user: User,
            iscouncilor: isCouncilorBoolean
          });
        }
        else {
          req.flash('warning', { msg: 'This meeting is not currently in progress.'});
          res.render('meetings/expanded-meeting', {
            title: 'Expanded Meeting Information',
            meeting: matching_meeting,
            user: User,
            iscouncilor: isCouncilorBoolean
          });
        }
      });
  });
}




/**
  Render the full meeting information on a separate page
  GET /meetings/upvote/:comment_id/:meeting_id
// */
exports.upvote = async(res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    LiveComment.findOne({_id: req.params.comment_id})
      .populate({path: 'upvotes'})
      .exec(function(err, comment){
      Users.findOne({email: emailString}).exec(function(err, user){
        added = comment.upvotes.pushIfNotExist(user, function(e) { 
          return e.email === user.email;
        });
        comment.save();
        if (!added) {
          req.flash('warning', { msg: 'You already upvoted this.'});
        }
        res.redirect('/meetings/live-meeting/'+req.params.meeting_id);
      });
    });
  });
}




/**
  Render the full meeting information on a separate page
  GET /meetings/live-meeting/:assigned_id
// */
exports.renderOpenComment = async(res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    console.log("resolved the promise");
    console.log(isCouncilor)
    console.log("RESULT:",isCouncilor.result)
    Meeting.findOne({"assigned_id": req.params.assigned_id}).populate({path: 'live_comments', populate: {path: 'author'}}).exec(function(err, matching_meeting) {
      if (err) {
        console.log("Error finding meeting with id: ", req.params.assigned_id);
      }
      if (!matching_meeting) {
        console.log("Error finding newly created meeting:",err, " with assigned_id:",req.params.assigned_id);
      }
      if (matching_meeting.is_open_comment){
        res.render('meetings/open-comment', {
          title: 'Open Comment',
          meeting: matching_meeting,
          user: User,
          iscouncilor: isCouncilorBoolean
        });
      }
      else {
         req.flash('warning', { msg: 'This meeting is not currently in progress.'});
         res.render('meetings/expanded-meeting', {
          title: 'Expanded Meeting Information',
          meeting: matching_meeting,
          user: User,
          iscouncilor: isCouncilorBoolean
        });
      }
    })
  });
}



/**
  Edit a meeting by its assigned_id
  GET /meetings/edit/:assigned_id
*/
exports.edit = async (res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Meeting.findOne({"assigned_id": req.params.assigned_id}, function(err, matching_meeting) {
      if (err) {
        console.log("Error finding meeting with id: ", req.params.assigned_id);
      }
      if (!matching_meeting) {
        console.log("Error finding meeting for edits:",err, " with assigned_id:",req.params.assigned_id);
      }
      res.render('meetings/edit', {
        title: 'Edit',
        meeting: matching_meeting,
        user: User,
        iscouncilor: isCouncilorBoolean
      });
    })
  });
}


/**
  Edit a meeting by its assigned_id, submit the edit and upsert to db
  POST /meetings/edit/:assigned_id
*/
exports.submitEdit = async (res, req) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    res.redirect('/');
  });
  // Meeting.findOne({"assigned_id": req.params.assigned_id}, function(err, matching_meeting) {
  //   if (err) {
  //     console.log("Error finding meeting with id: ", req.params.assigned_id);
  //   }
  //   if (!matching_meeting) {
  //     console.log("Error finding meeting for edits:",err, " with assigned_id:",req.params.assigned_id);
  //   }
  //   res.render('meetings/edit', {
  //     title: 'Edit',
  //     meeting: matching_meeting
  //   });
  // })
}



/**
  Delete a meeting by its assigned_id
  /meetings/delete/:assigned_id
*/
exports.delete = async (res, req) => {
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    if (isCouncilorBoolean) {
      Meeting.deleteOne({"assigned_id": req.params.assigned_id}, function(err, matching_meeting) {
        if (err) {
          console.log("Error deleting meeting with assigned_id: ", req.params.assigned_id);
        }
        req.flash('warning', { msg: 'Success! You just deleted a meeting.'});
        res.redirect('/');
      });
    }
    else {
        req.flash('error', { msg: 'Unable to delete meeting.'});
        res.redirect('/');
    }
  });
}




/**
 * GET /meetings/follow-meeting/:assigned_id
   Subscribe to updates on a meeting
 */
exports.followMeeting = (res, req) => {
  assigned_id = req.params["assigned_id"];

  Meeting.findOne({"assigned_id": assigned_id}, function (err, subscribed_meeting) {
    if (err) {
      console.log("Error subscribing to meeting with id: ", assigned_id, "with Error:",err)
    }

    Users.findOne({email: req.user.email}).populate('subscriptions').exec(function(err, matchingUser){
      matchingUser.subscriptions.pushIfNotExist(subscribed_meeting, function(e) { 
        return e.assigned_id === subscribed_meeting.assigned_id;
      });
      matchingUser.save();
    })
  });
  req.flash('success', { msg: 'Success! You just subscribed to an issue.'});
  res.redirect('/meetings/expanded-meeting/'+assigned_id);
}





/**
 * GET /meetings/unfollow-meeting/:assigned_id
   Unsubscribe to updates on a meeting
 */
exports.unfollowMeeting = (res, req) => {
  assigned_id = req.params["assigned_id"];

  Meeting.findOne({"assigned_id": assigned_id}, function (err, subscribed_meeting) {
    if (err) {
      console.log("Error subscribing to meeting with id: ", assigned_id, "with Error:",err)
    }

    Users.findOne({email: req.user.email}).populate('subscriptions').exec(function(err, matchingUser){
      matchingUser.subscriptions.splice( 
        matchingUser.subscriptions.indexOf( 
          matchingUser.subscriptions.filter( function(e) { 
            return e.assigned_id === assigned_id;
      })));
      matchingUser.save();
    })
  });
  req.flash('success', { msg: 'Success! You just unfollowed an issue.'});
  res.redirect('/account/subscriptions/');
}







// HELPERS

function prepareCalendarEvent(n){
  // TODO - Parse the time and date so that this is correct
  const event = {
    start: [2019, 3, 30, 6, 30],
    duration: { hours: 6, minutes: 30 },
    title: n["title"],
    description: n["body"],
    location: n["location_name"] + "; " + n["location_room"] + "; " + n["location_street"],
    url: n["url"],
    categories: ['Boston Local Government', 'Public Notice', 'Boston'],
    status: 'CONFIRMED'
  }
  return event;
}



function prepareMeetingObject(notice){
  return new Meeting(notice);
}


function addMeetingtoDb(notice){
  var meeting = prepareMeetingObject(notice);

  Meeting.findOne({"assigned_id": notice.assigned_id}, function(err, matching_meeting) {
    if (err) {
      console.log("Error finding meeting with id: ",notice.assigned_id);
    }
    if (!matching_meeting){
      meeting.save(function (err) {
        if (err) {
          console.log("Error adding to database:",err,notice);
        }
      })
    }
  })
}

function archiveOldMeeting(found_notices){
  // date = 
  // for (notice in found_notices){

  // }
}

function prepareLiveComment(comment){
  return new LiveComment(comment);
}

function addLiveCommenttoDb(comment, meeting){
  var comment = prepareLiveComment(comment);
  comment.save(function (err) {
    if (err) {
      console.log("Error adding to new live comment database:",err,comment);
    }
  })
  meeting.live_comments.push(comment);
  meeting.save();
}

function addLiveSubCommenttoDb(liveSubComment, comment){
  var newComment = prepareLiveComment(liveSubComment);
  newComment.save(function (err) {
    if (err) {
      console.log("Error adding to new live comment database:",err,newComment);
    }
  })
  comment.linkedLiveComments.push(newComment);
  comment.save();
}



function prepareIcs(event, eventId){
  ics.createEvent(event, (error, value) => {
      if (error) {
        console.log(error)
        return;
      }
      writeFileSync('Boston_Public_Notice_'+eventId+'.ics', value);
  })
  return 'Boston_Public_Notice_'+eventId+'.ics';
}



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