const homeRoute = require('./home');
const overridingRoutes = require('./overides');
const preferenceRoutes = require('./preferences');
const saveRoutes = require('./save');
const staticRoutes = require('./static');
const subredditRoutes = require('./subreddit');
const subscriptionRoutes = require('./subscription');
const userRoutes = require('./user');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);
allRoutes.use(staticRoutes);
allRoutes.use(preferenceRoutes);
allRoutes.use(subredditRoutes);
allRoutes.use(userRoutes);
allRoutes.use(subscriptionRoutes);
allRoutes.use(saveRoutes);
allRoutes.use(homeRoute);

module.exports = allRoutes;
