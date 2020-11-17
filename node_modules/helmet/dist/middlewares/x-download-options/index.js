"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function xDownloadOptions() {
    return function xDownloadOptionsMiddleware(_req, res, next) {
        res.setHeader("X-Download-Options", "noopen");
        next();
    };
}
module.exports = xDownloadOptions;
exports.default = xDownloadOptions;
