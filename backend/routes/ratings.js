const express = require('express');
const EpisodeRating = require('../models/EpisodeRating');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/ratings/:imdbID  (all my ratings for a show) ──
router.get('/:imdbID', protect, async (req, res) => {
  try {
    const ratings = await EpisodeRating.find({ user: req.user._id, imdbID: req.params.imdbID });
    // Return as lookup object: { "S1E1": { rating, note }, ... }
    const map = {};
    ratings.forEach(r => { map[`S${r.season}E${r.episode}`] = { rating: r.rating, note: r.note, id: r._id }; });
    res.json(map);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ratings/:imdbID  (set or update) ───
router.post('/:imdbID', protect, async (req, res) => {
  const { season, episode, rating, note } = req.body;
  if (!season || !episode || !rating) return res.status(400).json({ error: 'season, episode, rating required.' });
  try {
    const doc = await EpisodeRating.findOneAndUpdate(
      { user: req.user._id, imdbID: req.params.imdbID, season, episode },
      { rating, note: note || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/ratings/:imdbID/:season/:episode ──
router.delete('/:imdbID/:season/:episode', protect, async (req, res) => {
  try {
    await EpisodeRating.findOneAndDelete({
      user: req.user._id,
      imdbID: req.params.imdbID,
      season: req.params.season,
      episode: req.params.episode
    });
    res.json({ message: 'Rating removed.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
