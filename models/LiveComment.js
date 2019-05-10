const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const liveCommentSchema = new mongoose.Schema({
	author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	title: String,
	body: String,
	isTwitter: { type: Boolean, default: false },
	postedDate: { type : Date, default: Date.now },
	linkedLiveComments: [{type: mongoose.Schema.Types.ObjectId, ref: 'LiveComment'}],
	linkedOpenComments: [{type: mongoose.Schema.Types.ObjectId, ref: 'OpenComment'}],
	linkedHashtag: String,
	upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	meeting: {type: mongoose.Schema.Types.ObjectId, ref: 'Meeting'},
	showName: { type: Boolean, default: true },
	workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  });


const LiveComment = mongoose.model('LiveComment', liveCommentSchema);

module.exports = LiveComment;