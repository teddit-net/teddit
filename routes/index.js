const galleryRoute = require('./gallery');
const homeRoute = require('./home');
const overridingRoutes = require('./overides');
const pollRoute = require('./poll');
const preferenceRoutes = require('./preferences');
const saveRoutes = require('./save');
const searchRoute = require('./search');
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
allRoutes.use(searchRoute);
allRoutes.use(homeRoute);
allRoutes.use(galleryRoute);
allRoutes.use(pollRoute);

module.exports = allRoutes;
