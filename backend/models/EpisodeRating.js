const mongoose = require('mongoose');

const EpisodeRatingSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imdbID:    { type: String, required: true },   // show imdbID
  season:    { type: Number, required: true },
  episode:   { type: Number, required: true },
  epImdbID:  { type: String },                   // episode's own imdbID if available
  rating:    { type: Number, required: true, min: 1, max: 10 },
  note:      { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

EpisodeRatingSchema.index({ user: 1, imdbID: 1, season: 1, episode: 1 }, { unique: true });
EpisodeRatingSchema.index({ user: 1, imdbID: 1 });

module.exports = mongoose.model('EpisodeRating', EpisodeRatingSchema);
