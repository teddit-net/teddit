"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ALLOWED_TOKENS = new Set([
    "no-referrer",
    "no-referrer-when-downgrade",
    "same-origin",
    "origin",
    "strict-origin",
    "origin-when-cross-origin",
    "strict-origin-when-cross-origin",
    "unsafe-url",
    "",
]);
function getHeaderValueFromOptions({ policy = ["no-referrer"], }) {
    const tokens = typeof policy === "string" ? [policy] : policy;
    if (tokens.length === 0) {
        throw new Error("Referrer-Policy received no policy tokens");
    }
    const tokensSeen = new Set();
    tokens.forEach((token) => {
        if (!ALLOWED_TOKENS.has(token)) {
            throw new Error(`Referrer-Policy received an unexpected policy token ${JSON.stringify(token)}`);
        }
        else if (tokensSeen.has(token)) {
            throw new Error(`Referrer-Policy received a duplicate policy token ${JSON.stringify(token)}`);
        }
        tokensSeen.add(token);
    });
    return tokens.join(",");
}
function referrerPolicy(options = {}) {
    const headerValue = getHeaderValueFromOptions(options);
    return function referrerPolicyMiddleware(_req, res, next) {
        res.setHeader("Referrer-Policy", headerValue);
        next();
    };
}
module.exports = referrerPolicy;
exports.default = referrerPolicy;
