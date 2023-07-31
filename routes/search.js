const config = require('../config');
const searchRoute = require('express').Router();

searchRoute.get('/search', (req, res, next) => {
  let q = req.query.q;

  if (typeof q === 'undefined') {
    return res.render('search', {
      json: { posts: [] },
      no_query: true,
      q: '',
      restrict_sr: undefined,
      nsfw: undefined,
      subreddit: 'all',
      sortby: undefined,
      past: undefined,
      user_preferences: req.cookies,
      instance_config: config,
    });
  }

  let restrict_sr = req.query.restrict_sr;
  let nsfw = req.query.nsfw;
  let sortby = req.query.sort;
  let past = req.query.t;
  let after = req.query.after;
  let before = req.query.before;
  if (!after) {
    after = '';
  }
  if (!before) {
    before = '';
  }
  if (restrict_sr !== 'on') {
    restrict_sr = 'off';
  }

  if (nsfw !== 'on') {
    nsfw = 'off';
  }
  let d = `&after=${after}`;
  if (before) {
    d = `&before=${before}`;
  }
  return res.redirect(
    `/r/all/search?q=${q}&restrict_sr=${restrict_sr}&nsfw=${nsfw}&sort=${sortby}&t=${past}${d}`
  );
});

module.exports = searchRoute;
