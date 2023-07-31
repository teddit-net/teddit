const pollRoute = require('express').Router();

pollRoute.get('/poll/:id', (req, res, next) => {
  return res.redirect(`/comments/${req.params.id}`);
});

module.exports = pollRoute;
