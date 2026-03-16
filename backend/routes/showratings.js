const express    = require('express');
const ShowRating = require('../models/ShowRating');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/showratings/:imdbID — get my rating for a show
router.get('/:imdbID', protect, async (req, res) => {
  try {
    const r = await ShowRating.findOne({ user: req.user._id, imdbID: req.params.imdbID });
    res.json(r || null);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showratings/:imdbID — set or update rating
router.post('/:imdbID', protect, async (req, res) => {
  const { rating, note, showTitle, showPoster, showYear } = req.body;
  if (!rating || rating < 1 || rating > 10) return res.status(400).json({ error: 'Rating 1-10 required.' });
  try {
    const doc = await ShowRating.findOneAndUpdate(
      { user: req.user._id, imdbID: req.params.imdbID },
      { rating, note: note||'', showTitle, showPoster, showYear, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/showratings/:imdbID — remove rating
router.delete('/:imdbID', protect, async (req, res) => {
  try {
    await ShowRating.findOneAndDelete({ user: req.user._id, imdbID: req.params.imdbID });
    res.json({ deleted: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/showratings — get ALL my show ratings sorted best→worst
router.get('/', protect, async (req, res) => {
  try {
    const ratings = await ShowRating.find({ user: req.user._id }).sort({ rating: -1 });
    res.json(ratings);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
