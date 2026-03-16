const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6 },
  displayName: { type: String, trim: true, maxlength: 50 },
  bio:         { type: String, trim: true, maxlength: 300, default: '' },
  avatarColor: { type: String, default: '#e8a000' },
  country:     { type: String, default: '' },
  website:     { type: String, default: '' },
  joinedAt:    { type: Date, default: Date.now },
  lastSeenAt:  { type: Date, default: Date.now },

  favorites:  [{ imdbID: String, title: String, poster: String, year: String, rating: String, addedAt: { type: Date, default: Date.now } }],
  watchLater: [{ imdbID: String, title: String, poster: String, year: String, rating: String, addedAt: { type: Date, default: Date.now } }],
  watching:   [{ imdbID: String, title: String, poster: String, year: String, rating: String, addedAt: { type: Date, default: Date.now } }],
  completed:  [{ imdbID: String, title: String, poster: String, year: String, rating: String, addedAt: { type: Date, default: Date.now } }],

  settings: {
    publicProfile:      { type: Boolean, default: true },
    publicLists:        { type: Boolean, default: true },
    showSpoilers:       { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    defaultCategory:    { type: String,  default: 'all' }
  },

  role: { type: String, default: 'user', enum: ['user', 'admin'] }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);
