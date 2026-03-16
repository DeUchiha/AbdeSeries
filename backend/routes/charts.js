const express = require('express');
const Review  = require('../models/Review');
const router  = express.Router();

// ── GET /api/charts/top  (top rated shows by community reviews) ──
router.get('/top', async (req, res) => {
  try {
    const top = await Review.aggregate([
      { $group: {
          _id: '$imdbID',
          avgRating:   { $avg: '$rating' },
          reviewCount: { $sum: 1 },
          showTitle:   { $first: '$showTitle' },
          showPoster:  { $first: '$showPoster' }
      }},
      { $match: { reviewCount: { $gte: 1 } } },
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 20 }
    ]);
    res.json(top);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/charts/trending  (most reviewed this week) ──
router.get('/trending', async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const trending = await Review.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
          _id: '$imdbID',
          reviewCount: { $sum: 1 },
          avgRating:   { $avg: '$rating' },
          showTitle:   { $first: '$showTitle' },
          showPoster:  { $first: '$showPoster' }
      }},
      { $sort: { reviewCount: -1 } },
      { $limit: 12 }
    ]);
    res.json(trending);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
