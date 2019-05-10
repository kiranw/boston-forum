const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
	name: String,
	owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	users: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	imgpath: String,
	accessCode: String
  });


const workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = workspace;