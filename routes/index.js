const overridingRoutes = require('./overides');

const allRoutes = require('express').Router();

allRoutes.use(overridingRoutes);

module.exports = allRoutes;
