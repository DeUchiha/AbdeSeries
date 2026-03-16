require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app = express();

// CORS — allow both direct file open and localhost
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// API Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/users',   require('./routes/users'));
app.use('/api/shows',   require('./routes/shows'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/stats',       require('./routes/stats'));
app.use('/api/showratings', require('./routes/showratings'));
app.use('/api/charts',  require('./routes/charts'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// All non-API routes → frontend
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Connect to MongoDB and start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('');
    console.log('  ✅  MongoDB connected successfully!');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log('');
      console.log('  🚀  AbdeSeries is running!');
      console.log(`  🌐  Open this in your browser → http://localhost:${PORT}`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('');
    console.error('  ❌  MongoDB connection failed:', err.message);
    console.error('');
    console.error('  ➡  Check your MONGO_URI in backend/.env');
    console.error('');
    process.exit(1);
  });
