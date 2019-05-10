const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Workspace = require('../models/Workspace');
const Users = require('../models/User');
const LiveComment = require('../models/LiveComment');
const OpenComment = require('../models/OpenComment');
const Tag = require('../models/Tag');

const path = require("path");
const publicPath = path.resolve(__dirname, "../public"); 




exports.newWorkspace = (req, res, next) => {
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    res.render('workspace/new-workspace', {
      title: 'Create a new workspace',
      user: User,
      iscouncilor: isCouncilorBoolean
    });
  });
}

/**
  New Meeting from
  POST /workspace/edit
*/
exports.create = async (req, res, next) => {  
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Users.findOne({"email":req.user.email}).populate('workspaces').exec(function(err,fullUser){
      validated_workspace = {}
      validated_workspace["name"] = req.body["workspace-name"];
      validated_workspace["imgpath"] = req.body["workspace-icon"];
      validated_workspace["accessCode"] = Math.random().toString(36).substr(2,50)+Math.random().toString(36).substr(2,50);
      validated_workspace["owner"] = fullUser;
      validated_workspace["users"] = [fullUser];

      workspace = new Workspace(validated_workspace);
      workspace.save();
      fullUser.workspaces.pushIfNotExist(workspace, function(e) { 
          return e.id === workspace.id;
      });
      fullUser.save();

      req.flash('success', { msg: "Wicked! You just made a new workspace."});
      res.redirect('/account/workspaces/');
    });
  });
}




/**
  New Meeting from
  POST /workspace/join
*/
exports.join = async (req, res, next) => {  
  const User = req.user;
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    Users.findOne({"email":req.user.email}).populate('workspaces').exec(function(err,fullUser){
      code = req.body["workspace-code"];
      Workspace.findOne({accessCode: code}).populate("users").exec(function(err, workspace) {
        if (err) {
          req.flash('errors', { msg: "Sorry! We can't seem to find a workspace with this code!"});
          res.redirect('/account/workspaces/');
        }
        console.log(workspace);
        if (!workspace || workspace == null){
          req.flash('errors', { msg: "Sorry! We can't seem to find a workspace with this code!"});
          res.redirect('/workspace/new-workspace/');          
        } else {
          console.log(workspace.users);
          workspace.users.pushIfNotExist(fullUser, function(e){
            return e.id === fullUser.id;
          });
          workspace.save();
          fullUser.workspaces.pushIfNotExist(workspace, function(e) { 
              return e.id === workspace.id;
          });
          fullUser.save();

          req.flash('success', { msg: "Wicked! You just joined the " + workspace.name + " workspace."});
          res.redirect('/account/workspaces/');
        }
      })
    });
  });
}




/**
 * GET /workspace/leave/:workspace_id
   Leave a workspace
 */
exports.leave = (req, res, next) => {  
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  workspaceID = req.params["workspace_id"];
  console.log(workspaceID);

  Workspace.findOne({_id: workspaceID}).populate("users").exec(function (err, ws) {
    if (err) {
      console.log("Error leaving workspace with id: ", workspaceID, "with Error:",err)
    }
    console.log("ID:",ws);
    Users.findOne({email: req.user.email}).populate('workspaces').exec(function(err, matchingUser){
      ws.users.splice( 
        ws.users.indexOf( 
          ws.users.filter( function(e) { 
            return e.id === matchingUser.id;
      })));
      ws.save();
      matchingUser.workspaces.splice(
        matchingUser.workspaces.indexOf(
          matchingUser.workspaces.filter( function(e) {
            return e.id === workspaceID;
          })
        )
      );
      matchingUser.save();
      req.flash('success', { msg: 'Success! You just left the workspace, ' + ws.name + "."});
      res.redirect('/account/workspaces/');
    })
  });
}




// ==================================================
// HELPERS 
// ==================================================


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