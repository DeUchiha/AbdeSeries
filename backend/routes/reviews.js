const express = require('express');
const { body, validationResult } = require('express-validator');
const Review  = require('../models/Review');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/reviews/:imdbID ──────────────────────
router.get('/:imdbID', optionalAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ imdbID: req.params.imdbID })
      .populate('user', 'username displayName avatarColor')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/reviews/:imdbID ─────────────────────
router.post('/:imdbID', protect, [
  body('rating').isFloat({ min: 1, max: 10 }),
  body('title').optional().trim().isLength({ max: 120 }),
  body('body').optional().trim().isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const { rating, title, body, containsSpoilers, showTitle, showPoster } = req.body;
    const review = await Review.findOneAndUpdate(
      { user: req.user._id, imdbID: req.params.imdbID },
      { rating, title, body, containsSpoilers: !!containsSpoilers, showTitle, showPoster },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await review.populate('user', 'username displayName avatarColor');
    res.json(review);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/reviews/:imdbID (edit) ──────────────
router.put('/:imdbID', protect, [
  body('rating').isFloat({ min: 1, max: 10 }),
  body('title').optional().trim().isLength({ max: 120 }),
  body('body').optional().trim().isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const { rating, title, body, containsSpoilers } = req.body;
    const review = await Review.findOneAndUpdate(
      { user: req.user._id, imdbID: req.params.imdbID },
      { rating, title, body, containsSpoilers: !!containsSpoilers, updatedAt: new Date() },
      { new: true }
    ).populate('user', 'username displayName avatarColor');
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json(review);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/reviews/:imdbID ───────────────────
router.delete('/:imdbID', protect, async (req, res) => {
  try {
    await Review.findOneAndDelete({ user: req.user._id, imdbID: req.params.imdbID });
    res.json({ message: 'Review deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/reviews/:id/like ────────────────────
router.post('/:id/like', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    const idx = review.likes.indexOf(req.user._id);
    if (idx === -1) { review.likes.push(req.user._id); review.likesCount++; }
    else { review.likes.splice(idx, 1); review.likesCount--; }
    await review.save();
    res.json({ liked: idx === -1, likesCount: review.likesCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/reviews/user/:userId ─────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId })
      .sort({ createdAt: -1 }).limit(20);
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
