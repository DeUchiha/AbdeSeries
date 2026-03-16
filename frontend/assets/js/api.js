// AbdeSeries — API Client
const API_BASE = 'http://localhost:5000/api';

class ApiClient {
  constructor() { this._token = localStorage.getItem('as_token') || null; }
  setToken(t)  { this._token = t; t ? localStorage.setItem('as_token', t) : localStorage.removeItem('as_token'); }
  getToken()   { return this._token; }

  async _req(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  get(p)      { return this._req('GET',    p); }
  post(p, b)  { return this._req('POST',   p, b); }
  patch(p, b) { return this._req('PATCH',  p, b); }
  del(p)      { return this._req('DELETE', p); }
  put(p, b)   { return this._req('PUT',    p, b); }

  // Auth
  register(d)            { return this.post('/auth/register', d); }
  login(email, password) { return this.post('/auth/login', { email, password }); }
  me()                   { return this.get('/auth/me'); }
  changePassword(d)      { return this.post('/auth/change-password', d); }

  // Users
  updateProfile(d)       { return this.patch('/users/me/profile', d); }
  updateSettings(d)      { return this.patch('/users/me/settings', d); }
  getLists()             { return this.get('/users/me/lists'); }
  toggleList(type, d)    { return this.post(`/users/me/list/${type}`, d); }

  // Shows — batch is much faster for loading grids
  searchShows(q, type)   { return this.get(`/shows/search?q=${encodeURIComponent(q)}${type ? '&type=' + type : ''}`); }
  getShow(id)            { return this.get(`/shows/${id}`); }
  getBatch(ids)          { return this.get(`/shows/batch?ids=${ids.join(',')}`); }  // ← FAST batch
  getSeason(id, n)       { return this.get(`/shows/${id}/season/${n}`); }
  getEpisode(id, s, e)   { return this.get(`/shows/${id}/season/${s}/episode/${e}`); }
  getCast(id)            { return this.get(`/shows/${id}/cast`); }

  // Reviews
  getReviews(imdbID)     { return this.get(`/reviews/${imdbID}`); }
  submitReview(imdbID,d) { return this.post(`/reviews/${imdbID}`, d); }
  deleteReview(imdbID)   { return this.del(`/reviews/${imdbID}`); }
  likeReview(id)         { return this.post(`/reviews/${id}/like`); }

  // Episode Ratings
  getMyRatings(imdbID)   { return this.get(`/ratings/${imdbID}`); }
  rateEpisode(imdbID, d) { return this.post(`/ratings/${imdbID}`, d); }

  // Stats & Charts
  getMyStats()           { return this.get('/stats/me'); }
  getMyShowRatings()     { return this.get('/showratings'); }
  getMyShowRating(id)    { return this.get(`/showratings/${id}`); }
  rateShow(id, d)        { return this.post(`/showratings/${id}`, d); }
  deleteShowRating(id)   { return this.del(`/showratings/${id}`); }
  getMyReviews()         { return this.get('/stats/my-reviews'); }
  getMyEpRatings()       { return this.get('/stats/my-ep-ratings'); }
  updateReview(imdbID,d) { return this.put(`/reviews/${imdbID}`, d); }
  getTopCharts()         { return this.get('/charts/top'); }
  getTrendingCharts()    { return this.get('/charts/trending'); }
}

window.API = new ApiClient();
