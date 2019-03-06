const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Users = require('../models/User');


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


/**
 * GET /meetings/public-notices
  Boston public notices
 */
exports.getPublicNotices = (req, res, next) => {
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
      delete n["id"];

      addMeetingtoDb(n);
      return n;
    }); 

    user = req.user;

    Meeting.find({"canceled":false}, function(err, found_notices) {
      if (err) {
        console.log("Error querying notices: ",err)
        return [];
      }
      res.render('meetings/public-notices', {
        title: 'Public Notices API',
        notices: found_notices,
        user: req.user
      });
    })
  });
};


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

/**
 * GET /meetings/open-comments
  Get open comment period issues
 */
exports.getOpenComments = (req, res, next) => {
  user = req.user;
  Meeting.find({is_open_comment:true}).exec(function(err, meetings) {
    res.render('meetings/open-comments', {
        title: 'Open Comments',
        opencomments: meetings,
        user: user
    });
  });
}



/**
 * GET /meetings/live-meetings
  Get open comment period issues
 */
exports.getLiveMeetings = (req, res, next) => {
  user = req.user;
  Meeting.find({is_live:true}).exec(function(err, meetings) {
    res.render('meetings/live-meetings', {
      title: 'Live Meetings',
      livemeetings: meetings,
      user: user
    });
  });
}





/**
  New Meeting Form
*/
exports.newMeeting = (req, res, next) => {
  const unknownUser = !(req.user);

  res.render('meetings/new-meeting', {
    title: 'New Notice',
    unknownUser,
    user: req.user
  });
}


/**
  New Meeting Form
*/
exports.create = (req, res, next) => {
  const User = req.user;

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

  meeting = prepareMeetingObject(validated_meeting);
  addMeetingtoDb(meeting);

  res.redirect('/meetings/expanded-meeting/'+validated_meeting["assigned_id"]);
}


exports.renderExpandedMeeting = (res, req) => {
  const User = req.user;
  Meeting.findOne({"assigned_id": req.params.assigned_id}, function(err, matching_meeting) {
    if (err) {
      console.log("Error finding meeting with id: ", req.params.assigned_id);
    }
    if (!matching_meeting) {
      console.log("Error finding newly created meeting:",err, " with assigned_id:",req.params.assigned_id);
    }
    res.render('meetings/expanded-meeting', {
      title: 'Expanded Meeting Information',
      meeting: matching_meeting,
      user: User
    });
  })
}



/**
  Delete a meeting by its assigned_id
  GET /meetings/edit/:assigned_id
*/
exports.edit = (res, req) => {
  const User = req.user;
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
      user: User
    });
  })
}


/**
  Edit a meeting by its assigned_id, submit the edit and upsert to db
  POST /meetings/edit/:assigned_id
*/
exports.submitEdit = (res, req) => {
  const User = req.user;
  console.log(User);
  res.redirect('/');
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
exports.delete = (res, req) => {
  if (req.user) {
    Meeting.deleteOne({"assigned_id": req.params.assigned_id}, function(err, matching_meeting) {
      if (err) {
        console.log("Error deleting meeting with assigned_id: ", req.params.assigned_id);
      }
      res.redirect('/');
    });
  }
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

    console.log(subscribed_meeting);

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
    }
}; 