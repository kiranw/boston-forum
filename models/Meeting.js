const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  assigned_id: { type: String, unique: true },
  testimony_time: String,
  url: String,
  title: String,
  location_name: String,
  location_room: String,
  location_street: String,
  canceled: { type: Boolean, default: false },
  notice_date: String,
  notice_time: String,
  field_drawer: String,
  notice_body: String,
  posted: String,
  ics: String,

  is_agenda_setting: { type: Boolean, default: false },
  is_agenda_set: { type: Boolean, default: false },
  is_live: { type: Boolean, default: false },
  is_open_comment: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
  
  agenda_path: String,
  meeting_minutes_path: String,
  owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  live_comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LiveComment' }],
  open_comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OpenComment' }],
  hashtags: [{type: String}]
  });


const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
