const express = require('express');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const Review  = require('../models/Review');
const EpisodeRating = require('../models/EpisodeRating');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/:username  (public profile) ───
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -refreshTokens -email');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.settings.publicProfile && (!req.user || req.user._id.toString() !== user._id.toString())) {
      return res.status(403).json({ error: 'This profile is private.' });
    }
    const [reviewCount, ratingCount] = await Promise.all([
      Review.countDocuments({ user: user._id }),
      EpisodeRating.countDocuments({ user: user._id })
    ]);
    res.json({ ...user.toObject(), reviewCount, ratingCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/users/me/profile ──────────────────
router.patch('/me/profile', protect, [
  body('username').optional().trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_.-]+$/),
  body('displayName').optional().trim().isLength({ max: 50 }),
  body('bio').optional().trim().isLength({ max: 300 }),
  body('country').optional().trim().isLength({ max: 60 }),
  body('website').optional().trim().isLength({ max: 100 }),
  body('avatarColor').optional().matches(/^#[0-9a-fA-F]{6}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const { username, displayName, bio, country, website, avatarColor } = req.body;
    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (taken) return res.status(409).json({ error: 'Username already taken.' });
    }
    const update = {};
    if (username)    update.username    = username;
    if (displayName !== undefined) update.displayName = displayName;
    if (bio !== undefined)         update.bio         = bio;
    if (country !== undefined)     update.country     = country;
    if (website !== undefined)     update.website     = website;
    if (avatarColor)               update.avatarColor = avatarColor;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password -refreshTokens');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/users/me/settings ─────────────────
router.patch('/me/settings', protect, async (req, res) => {
  try {
    const allowed = ['theme','language','defaultCategory','showSpoilers','emailNotifications','publicProfile','publicLists'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[`settings.${k}`] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-password -refreshTokens');
    res.json(user.settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/users/me/list/:type  (toggle) ──────
router.post('/me/list/:type', protect, async (req, res) => {
  const { type } = req.params;
  const LISTS = ['favorites','watchLater','watching','completed'];
  if (!LISTS.includes(type)) return res.status(400).json({ error: 'Invalid list type.' });
  const { imdbID, title, poster, year, rating, type: showType } = req.body;
  if (!imdbID) return res.status(400).json({ error: 'imdbID required.' });
  try {
    const user = await User.findById(req.user._id);
    const list = user[type];
    const idx  = list.findIndex(x => x.imdbID === imdbID);
    let action;
    if (idx === -1) {
      list.push({ imdbID, title, poster, year, rating, type: showType });
      action = 'added';
    } else {
      list.splice(idx, 1);
      action = 'removed';
    }
    await user.save();
    res.json({ action, list: user[type] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/users/me/lists ───────────────────────
router.get('/me/lists', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites watchLater watching completed');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
