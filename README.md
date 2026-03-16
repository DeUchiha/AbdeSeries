# 📺 AbdeSeries

A full-stack TV & anime episode rating tracker. Explore any show's episodes through interactive heatmaps and charts, rate episodes and full shows, write community reviews, and manage your personal watchlists.

Built with **Node.js**, **Express**, **MongoDB**, and **vanilla JavaScript**, powered by TMDB and OMDB APIs.

---

## ✨ Features

- 📊 Interactive episode heatmaps with color-coded ratings
- 📈 Scrollable episode rating charts (IMDB + your personal ratings)
- 🎬 Dedicated episode pages with stills, plot, crew, and IMDB link
- ⭐ Rate individual episodes and full shows (1–10)
- 💬 Community reviews per show and episode (write, edit, delete, like)
- 📋 Personal lists — Favorites, Watch Later, Watching, Completed
- 🏆 Top Charts — community ratings, trending, and your personal rankings
- 📊 My Stats — rating distribution, activity history, and episode ratings
- 🔐 JWT authentication with customizable profile and avatar

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) (local install) or a [MongoDB Atlas](https://www.mongodb.com/atlas) account
- A free [OMDB API key](https://www.omdbapi.com/apikey.aspx)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AbdeSeries.git
cd AbdeSeries
```

**2. Install backend dependencies**
```bash
cd backend
npm install
```

**3. Set up your environment variables**

Copy the example file and fill in your own values:
```bash
cp .env.example .env
```

Then open `backend/.env` and fill in:
```
MONGO_URI=mongodb://localhost:27017/abdeseries
OMDB_KEY=your_omdb_api_key
TMDB_KEY=your_tmdb_api_key
JWT_SECRET=any_random_secret_string
PORT=5000
```

**4. Start the app**

On Windows:
```bash
cd ..
START.bat
```

On Mac/Linux:
```bash
cd ..
bash START.sh
```

**5. Open your browser**
```
http://localhost:5000
```

---

## 🔑 Getting API Keys

| Service | Free Plan | Link |
|---------|-----------|------|
| OMDB | 1,000 requests/day | [omdbapi.com/apikey](https://www.omdbapi.com/apikey.aspx) |
| TMDB | Unlimited | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |

---

## 🗂️ Project Structure

```
AbdeSeries/
├── backend/
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API endpoints
│   ├── middleware/    # Auth middleware
│   ├── server.js      # Express server
│   ├── .env           # Your keys (never committed)
│   └── .env.example   # Template for setup
├── frontend/
│   ├── index.html
│   └── assets/
│       ├── css/main.css
│       └── js/
│           ├── api.js
│           └── app.js
├── START.bat          # Windows launcher
├── START.sh           # Mac/Linux launcher
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Frontend | Vanilla JavaScript, Chart.js |
| Auth | JWT |
| Data | TMDB API, OMDB API |
| Fonts | Bebas Neue, Syne, DM Mono |

---

## 📄 License

MIT — feel free to use, modify, and share.
