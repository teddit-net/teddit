"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ALLOWED_PERMITTED_POLICIES = new Set([
    "none",
    "master-only",
    "by-content-type",
    "all",
]);
function getHeaderValueFromOptions({ permittedPolicies = "none", }) {
    if (ALLOWED_PERMITTED_POLICIES.has(permittedPolicies)) {
        return permittedPolicies;
    }
    else {
        throw new Error(`X-Permitted-Cross-Domain-Policies does not support ${JSON.stringify(permittedPolicies)}`);
    }
}
function xPermittedCrossDomainPolicies(options = {}) {
    const headerValue = getHeaderValueFromOptions(options);
    return function xPermittedCrossDomainPoliciesMiddleware(_req, res, next) {
        res.setHeader("X-Permitted-Cross-Domain-Policies", headerValue);
        next();
    };
}
module.exports = xPermittedCrossDomainPolicies;
exports.default = xPermittedCrossDomainPolicies;
