const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imdbID:    { type: String, required: true, index: true },
  showTitle: { type: String },
  showPoster:{ type: String },

  // ─── Content ───────────────────────────────────
  rating:    { type: Number, min: 1, max: 10 },   // overall show rating (1-10)
  title:     { type: String, trim: true, maxlength: 120 },
  body:      { type: String, trim: true, maxlength: 2000 },
  containsSpoilers: { type: Boolean, default: false },

  // ─── Reactions ─────────────────────────────────
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:{ type: Number, default: 0 }

}, { timestamps: true });

ReviewSchema.index({ imdbID: 1, user: 1 }, { unique: true }); // one review per show per user
ReviewSchema.index({ imdbID: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
