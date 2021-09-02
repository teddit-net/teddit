const overridingRoutes = require('./overides');
const preferenceRoutes = require('./preferences');
const staticRoutes = require('./static');
const subredditRoutes = require('./subreddit');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);
allRoutes.use(staticRoutes);
allRoutes.use(preferenceRoutes);
allRoutes.use(subredditRoutes);

module.exports = allRoutes;
