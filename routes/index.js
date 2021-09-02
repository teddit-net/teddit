const overridingRoutes = require('./overides');
const preferenceRoutes = require('./preferences');
const staticRoutes = require('./static');
const subredditRoutes = require('./subreddit');
const userRoutes = require('./user');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);
allRoutes.use(staticRoutes);
allRoutes.use(preferenceRoutes);
allRoutes.use(subredditRoutes);
allRoutes.use(userRoutes);

module.exports = allRoutes;
