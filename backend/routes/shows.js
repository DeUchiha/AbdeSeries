const express = require('express');
const https   = require('https');
const router  = express.Router();

// In-memory cache
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.time > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function setCache(key, data) { cache.set(key, { data, time: Date.now() }); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

const OMDB     = id    => `https://www.omdbapi.com/?i=${id}&apikey=${process.env.OMDB_KEY}`;
const OMDB_S   = (q,t) => `https://www.omdbapi.com/?s=${encodeURIComponent(q)}${t?`&type=${t}`:''}&apikey=${process.env.OMDB_KEY}`;
const OMDB_SEA = (id,n)=> `https://www.omdbapi.com/?i=${id}&Season=${n}&apikey=${process.env.OMDB_KEY}`;
const TMDB_FIND= id    => `https://api.themoviedb.org/3/find/${id}?api_key=${process.env.TMDB_KEY}&external_source=imdb_id`;
const TMDB_SEA = (id,n)=> `https://api.themoviedb.org/3/tv/${id}/season/${n}?api_key=${process.env.TMDB_KEY}&append_to_response=images`;

// Search
router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  const key = `search:${q}:${type||''}`;
  const hit = getCached(key); if (hit) return res.json(hit);
  try { const data = await fetchJSON(OMDB_S(q, type)); setCache(key, data); res.json(data); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// Batch fetch
router.get('/batch', async (req, res) => {
  const ids = (req.query.ids||'').split(',').filter(Boolean).slice(0,20);
  if (!ids.length) return res.json([]);
  try {
    const results = await Promise.all(ids.map(async id => {
      const key = `show:${id}`; const hit = getCached(key); if (hit) return hit;
      try { const d = await fetchJSON(OMDB(id)); if(d.Response==='True') setCache(key,d); return d; } catch { return null; }
    }));
    res.json(results.filter(r=>r&&r.Response==='True'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Show details
router.get('/:imdbID', async (req, res) => {
  const key = `show:${req.params.imdbID}`; const hit = getCached(key); if (hit) return res.json(hit);
  try { const data = await fetchJSON(OMDB(req.params.imdbID)); if(data.Response==='True') setCache(key,data); res.json(data); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SEASON — uses TMDB for complete episode ratings ──────────────────────────
// TMDB has ratings for every episode. OMDB only has ratings for popular ones.
// Strategy:
//   1. Find TMDB show ID from IMDB ID
//   2. Fetch TMDB season → get all episodes with vote_average
//   3. Merge with OMDB season data (episode titles/IMDB ratings as fallback)
//   4. Return unified Episodes[] array
router.get('/:imdbID/season/:n', async (req, res) => {
  const { imdbID, n } = req.params;
  const key = `season2:${imdbID}:${n}`;
  const hit = getCached(key); if (hit) return res.json(hit);

  try {
    // Step 1 — get TMDB ID (cache it separately so we don't re-lookup every season)
    let tmdbId = getCached(`tmdbid:${imdbID}`);
    if (!tmdbId) {
      const found = await fetchJSON(TMDB_FIND(imdbID));
      tmdbId = found.tv_results?.[0]?.id || null;
      if (tmdbId) setCache(`tmdbid:${imdbID}`, tmdbId);
    }

    // Step 2 — fetch TMDB season (has ratings for every episode)
    let tmdbEps = [];
    if (tmdbId) {
      try {
        const tmdbSeason = await fetchJSON(TMDB_SEA(tmdbId, n));
        tmdbEps = tmdbSeason.episodes || [];
      } catch(e) { console.log('TMDB season fetch failed:', e.message); }
    }

    // Step 3 — also fetch OMDB season for IMDB ratings and episode titles
    let omdbEps = [];
    try {
      const omdbSeason = await fetchJSON(OMDB_SEA(imdbID, n));
      if (omdbSeason.Response === 'True') omdbEps = omdbSeason.Episodes || [];
    } catch(e) { console.log('OMDB season fetch failed:', e.message); }

    // Step 4 — merge: use TMDB as primary source, OMDB as supplement
    let episodes = [];

    if (tmdbEps.length > 0) {
      episodes = tmdbEps.map((ep, idx) => {
        // Find matching OMDB episode by episode number
        const omdbEp = omdbEps.find(o => parseInt(o.Episode) === ep.episode_number);

        // TMDB vote_average is 0-10. Only use if it has votes.
        const tmdbRating = ep.vote_count >= 1 ? ep.vote_average?.toFixed(1) : null;
        // OMDB rating
        const omdbRating = omdbEp?.imdbRating && omdbEp.imdbRating !== 'N/A' && omdbEp.imdbRating !== '0.0' ? omdbEp.imdbRating : null;

        // Prefer OMDB rating (more accurate/trusted) but fall back to TMDB
        const finalRating = omdbRating || tmdbRating || 'N/A';

        return {
          Title:      ep.name || omdbEp?.Title || `Episode ${ep.episode_number}`,
          Released:   ep.air_date || omdbEp?.Released || 'N/A',
          Episode:    String(ep.episode_number),
          imdbRating: finalRating,
          imdbVotes:  omdbEp?.imdbVotes || (ep.vote_count ? String(ep.vote_count) + ' (TMDB)' : 'N/A'),
          imdbID:     omdbEp?.imdbID || 'N/A',
          tmdbRating: tmdbRating,
          overview:   ep.overview || ''
        };
      });
    } else if (omdbEps.length > 0) {
      // Fallback: OMDB only
      episodes = omdbEps.map(ep => ({
        Title:      ep.Title,
        Released:   ep.Released,
        Episode:    ep.Episode,
        imdbRating: ep.imdbRating !== 'N/A' && ep.imdbRating !== '0.0' ? ep.imdbRating : 'N/A',
        imdbVotes:  ep.imdbVotes || 'N/A',
        imdbID:     ep.imdbID || 'N/A'
      }));
    }

    const result = {
      Response: 'True',
      Season: n,
      Episodes: episodes,
      totalEpisodes: String(episodes.length)
    };

    if (episodes.length > 0) setCache(key, result);
    res.json(result);

  } catch(e) {
    console.error('Season fetch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Cast with TMDB photos
router.get('/:imdbID/cast', async (req, res) => {
  const { imdbID } = req.params;
  const key = `cast:${imdbID}`; const hit = getCached(key); if (hit) return res.json(hit);
  try {
    const [omdb, tmdbFound] = await Promise.all([
      fetchJSON(OMDB(imdbID)),
      fetchJSON(`https://api.themoviedb.org/3/find/${imdbID}?api_key=${process.env.TMDB_KEY}&external_source=imdb_id`)
    ]);
    const actorNames = omdb.Actors && omdb.Actors !== 'N/A' ? omdb.Actors.split(',').map(a=>a.trim()).filter(Boolean) : [];
    const tvRes  = tmdbFound.tv_results?.[0];
    const movRes = tmdbFound.movie_results?.[0];
    let tmdbCredits = [];
    if (tvRes)       tmdbCredits = (await fetchJSON(`https://api.themoviedb.org/3/tv/${tvRes.id}/credits?api_key=${process.env.TMDB_KEY}`)).cast||[];
    else if (movRes) tmdbCredits = (await fetchJSON(`https://api.themoviedb.org/3/movie/${movRes.id}/credits?api_key=${process.env.TMDB_KEY}`)).cast||[];
    const cast = actorNames.map(name => {
      const match = tmdbCredits.find(c => c.name.toLowerCase()===name.toLowerCase()||c.name.toLowerCase().includes(name.split(' ')[0].toLowerCase())||name.toLowerCase().includes(c.name.split(' ')[0].toLowerCase()));
      return { name, character:match?.character||'Cast Member', photo:match?.profile_path?`https://image.tmdb.org/t/p/w185${match.profile_path}`:null };
    });
    const known = new Set(actorNames.map(n=>n.toLowerCase()));
    tmdbCredits.slice(0,20).forEach(c => { if(!known.has(c.name.toLowerCase())&&cast.length<20) cast.push({name:c.name,character:c.character||'Cast Member',photo:c.profile_path?`https://image.tmdb.org/t/p/w185${c.profile_path}`:null}); });
    const result = { cast: cast.slice(0,20) };
    setCache(key, result);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── GET /api/shows/:imdbID/season/:s/episode/:e ── full episode details
router.get('/:imdbID/season/:s/episode/:e', async (req, res) => {
  const { imdbID, s, e } = req.params;
  const key = `ep:${imdbID}:${s}:${e}`;
  const hit = getCached(key); if (hit) return res.json(hit);
  try {
    // Get TMDB ID
    let tmdbId = getCached(`tmdbid:${imdbID}`);
    if (!tmdbId) {
      const found = await fetchJSON(TMDB_FIND(imdbID));
      tmdbId = found.tv_results?.[0]?.id || null;
      if (tmdbId) setCache(`tmdbid:${imdbID}`, tmdbId);
    }

    // Fetch episode details from TMDB
    let tmdbEp = null;
    let images = [];
    if (tmdbId) {
      try {
        tmdbEp = await fetchJSON(
          `https://api.themoviedb.org/3/tv/${tmdbId}/season/${s}/episode/${e}?api_key=${process.env.TMDB_KEY}&append_to_response=credits,images`
        );
        images = tmdbEp.images?.stills?.slice(0, 9).map(i =>
          `https://image.tmdb.org/t/p/w400${i.file_path}`) || [];
      } catch(err) { console.log('TMDB ep detail fail:', err.message); }
    }

    // Also fetch OMDB for IMDB rating
    let omdbRating = null, imdbVotes = null, omdbEpId = null;
    try {
      const omdbSeason = await fetchJSON(OMDB_SEA(imdbID, s));
      const omdbEp = (omdbSeason.Episodes||[]).find(ep => parseInt(ep.Episode) === parseInt(e));
      if (omdbEp) {
        omdbRating = omdbEp.imdbRating !== 'N/A' ? omdbEp.imdbRating : null;
        imdbVotes  = omdbEp.imdbVotes  !== 'N/A' ? omdbEp.imdbVotes  : null;
        omdbEpId   = omdbEp.imdbID     !== 'N/A' ? omdbEp.imdbID     : null;
      }
    } catch(err) { console.log('OMDB ep fail:', err.message); }

    const result = {
      title:       tmdbEp?.name || `Episode ${e}`,
      season:      parseInt(s),
      episode:     parseInt(e),
      airDate:     tmdbEp?.air_date || null,
      overview:    tmdbEp?.overview || null,
      runtime:     tmdbEp?.runtime  || null,
      imdbRating:  omdbRating,
      imdbVotes:   imdbVotes,
      tmdbRating:  tmdbEp?.vote_average ? tmdbEp.vote_average.toFixed(1) : null,
      tmdbVotes:   tmdbEp?.vote_count   || null,
      imdbEpId:    omdbEpId,
      director:    tmdbEp?.crew?.find(c => c.job === 'Director')?.name || null,
      writer:      tmdbEp?.crew?.filter(c => ['Writer','Screenplay','Story'].includes(c.job)).map(c=>c.name).slice(0,2).join(', ') || null,
      cast:        (tmdbEp?.guest_stars || []).slice(0, 6).map(a => ({
        name:      a.name,
        character: a.character,
        photo:     a.profile_path ? `https://image.tmdb.org/t/p/w185${a.profile_path}` : null
      })),
      images,
      still:       tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w400${tmdbEp.still_path}` : null,
    };
    setCache(key, result);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
