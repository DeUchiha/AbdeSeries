const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register ──────────────────────
router.post('/register', [
  body('username').trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_.-]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { username, email, password, displayName } = req.body;
  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      const field = exists.email === email ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} already taken.` });
    }
    const user = await User.create({ username, email, password, displayName: displayName || username });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, displayName: user.displayName, avatarColor: user.avatarColor, settings: user.settings } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid credentials.' });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, displayName: user.displayName, avatarColor: user.avatarColor, bio: user.bio, country: user.country, settings: user.settings, joinedAt: user.joinedAt, statsCache: user.statsCache } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshTokens');
  res.json(user);
});

// ── POST /api/auth/change-password ───────────────
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is wrong.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
