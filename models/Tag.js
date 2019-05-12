const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
	title: String,
	keywords:[String]
  });


const tag = mongoose.model('Tag', tagSchema);

module.exports = tag;