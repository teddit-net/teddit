const staticRoutes = require('express').Router();

staticRoutes.get('/privacy', (req, res, next) => {
  return res.render('privacypolicy', { user_preferences: req.cookies });
});

staticRoutes.get('/about', (req, res, next) => {
  return res.render('about', { user_preferences: req.cookies });
});

module.exports = staticRoutes;
