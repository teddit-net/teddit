const overridingRoutes = require('./overides');
const preferenceRoutes = require('./preferences');
const staticRoutes = require('./static');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);
allRoutes.use(staticRoutes);
allRoutes.use(preferenceRoutes);

module.exports = allRoutes;
