const express = require('express');
const Review  = require('../models/Review');
const EpisodeRating = require('../models/EpisodeRating');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/stats/me ─────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const user   = await User.findById(userId).select('favorites watchLater watching completed joinedAt username displayName');

    const [reviews, epRatings] = await Promise.all([
      Review.find({ user: userId }),
      EpisodeRating.find({ user: userId })
    ]);

    // Average rating given
    const allRatings = [
      ...reviews.map(r => r.rating).filter(Boolean),
      ...epRatings.map(r => r.rating)
    ];
    const avgRating = allRatings.length
      ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2)
      : null;

    // Rating distribution (1-10 buckets)
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: allRatings.filter(r => Math.round(r) === i + 1).length
    }));

    // Shows with most episodes rated
    const showGroups = {};
    epRatings.forEach(r => {
      showGroups[r.imdbID] = (showGroups[r.imdbID] || 0) + 1;
    });
    const topShows = Object.entries(showGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([imdbID, count]) => ({ imdbID, count }));

    // Recent activity (last 10 reviews)
    const recentReviews = reviews
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map(r => ({ imdbID: r.imdbID, showTitle: r.showTitle, showPoster: r.showPoster, rating: r.rating, createdAt: r.createdAt }));

    res.json({
      username:      user.username,
      displayName:   user.displayName,
      joinedAt:      user.joinedAt,
      totalFavorites:  user.favorites.length,
      totalWatchLater: user.watchLater.length,
      totalWatching:   user.watching.length,
      totalCompleted:  user.completed.length,
      totalReviews:    reviews.length,
      totalEpRatings:  epRatings.length,
      avgRating,
      distribution,
      topShows,
      recentReviews
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// ── GET /api/stats/my-reviews ─────────────────────
router.get('/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/stats/my-ep-ratings ──────────────────
router.get('/my-ep-ratings', protect, async (req, res) => {
  try {
    const ratings = await EpisodeRating.find({ user: req.user._id })
      .sort({ rating: -1 }); // highest first
    res.json(ratings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
