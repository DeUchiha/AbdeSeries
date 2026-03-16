const mongoose = require('mongoose');

const showRatingSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imdbID:   { type: String, required: true },
  showTitle:{ type: String },
  showPoster:{ type: String },
  showYear: { type: String },
  rating:   { type: Number, required: true, min: 1, max: 10 },
  note:     { type: String, maxlength: 300, default: '' },
  updatedAt:{ type: Date, default: Date.now }
}, { timestamps: true });

showRatingSchema.index({ user: 1, imdbID: 1 }, { unique: true });
module.exports = mongoose.model('ShowRating', showRatingSchema);
