const overridingRoutes = require('./overides');
const staticRoutes = require('./static');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);
allRoutes.use(staticRoutes);

module.exports = allRoutes;
