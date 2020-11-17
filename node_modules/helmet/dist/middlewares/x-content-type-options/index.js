"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function xContentTypeOptions() {
    return function xContentTypeOptionsMiddleware(_req, res, next) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        next();
    };
}
module.exports = xContentTypeOptions;
exports.default = xContentTypeOptions;
