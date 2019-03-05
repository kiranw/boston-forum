const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const liveCommentSchema = new mongoose.Schema({
  });


const LiveComment = mongoose.model('LiveComment', liveCommentSchema);

module.exports = LiveComment;