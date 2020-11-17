"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function xXssProtection() {
    return function xXssProtectionMiddleware(_req, res, next) {
        res.setHeader("X-XSS-Protection", "0");
        next();
    };
}
module.exports = xXssProtection;
exports.default = xXssProtection;
