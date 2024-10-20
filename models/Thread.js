const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Reply Schema
const replySchema = new Schema({
  text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false },
});

// Define Thread Schema
const threadSchema = new Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false },
  replies: [replySchema],
});

// Create models
const Thread = mongoose.model('Thread', threadSchema);
const Reply = mongoose.model('Reply', replySchema);

module.exports = { Thread, Reply };
