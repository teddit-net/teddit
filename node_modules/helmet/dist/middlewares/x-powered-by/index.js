"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function xPoweredBy() {
    return function xPoweredByMiddleware(_req, res, next) {
        res.removeHeader("X-Powered-By");
        next();
    };
}
module.exports = xPoweredBy;
exports.default = xPoweredBy;
