const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const openCommentSchema = new mongoose.Schema({
	author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	title: String,
	body: String,
	isTwitter: { type: Boolean, default: false },
	postedDate: { type : Date, default: Date.now },
	linkedComments: {type: mongoose.Schema.Types.ObjectId, ref: 'OpenComment'},
	linkedHashtag: String,
	upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	meeting: {type: mongoose.Schema.Types.ObjectId, ref: 'Meeting'}
  });


const OpenComment = mongoose.model('OpenComment', openCommentSchema);

module.exports = OpenComment;