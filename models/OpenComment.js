const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const openCommentSchema = new mongoose.Schema({
  });


const OpenComment = mongoose.model('OpenComment', openCommentSchema);

module.exports = OpenComment;