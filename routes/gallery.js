const galleryRoute = require('express').Router();

galleryRoute.get('/gallery/:id', (req, res, next) => {
  return res.redirect(`/comments/${req.params.id}`);
});

module.exports = galleryRoute;
