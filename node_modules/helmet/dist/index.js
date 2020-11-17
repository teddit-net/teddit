"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const content_security_policy_1 = __importDefault(require("./middlewares/content-security-policy"));
const expect_ct_1 = __importDefault(require("./middlewares/expect-ct"));
const referrer_policy_1 = __importDefault(require("./middlewares/referrer-policy"));
const strict_transport_security_1 = __importDefault(require("./middlewares/strict-transport-security"));
const x_content_type_options_1 = __importDefault(require("./middlewares/x-content-type-options"));
const x_dns_prefetch_control_1 = __importDefault(require("./middlewares/x-dns-prefetch-control"));
const x_download_options_1 = __importDefault(require("./middlewares/x-download-options"));
const x_frame_options_1 = __importDefault(require("./middlewares/x-frame-options"));
const x_permitted_cross_domain_policies_1 = __importDefault(require("./middlewares/x-permitted-cross-domain-policies"));
const x_powered_by_1 = __importDefault(require("./middlewares/x-powered-by"));
const x_xss_protection_1 = __importDefault(require("./middlewares/x-xss-protection"));
function helmet(options = {}) {
    var _a;
    if (((_a = options.constructor) === null || _a === void 0 ? void 0 : _a.name) === "IncomingMessage") {
        throw new Error("It appears you have done something like `app.use(helmet)`, but it should be `app.use(helmet())`.");
    }
    // This is overly verbose. It'd be nice to condense this while still being type-safe.
    if (Object.values(options).some((option) => option === true)) {
        throw new Error("Helmet no longer supports `true` as a middleware option. Remove the property from your options to fix this error.");
    }
    const middlewareFunctions = [];
    if (options.contentSecurityPolicy === undefined) {
        middlewareFunctions.push(content_security_policy_1.default());
    }
    else if (options.contentSecurityPolicy !== false) {
        middlewareFunctions.push(content_security_policy_1.default(options.contentSecurityPolicy));
    }
    if (options.dnsPrefetchControl === undefined) {
        middlewareFunctions.push(x_dns_prefetch_control_1.default());
    }
    else if (options.dnsPrefetchControl !== false) {
        middlewareFunctions.push(x_dns_prefetch_control_1.default(options.dnsPrefetchControl));
    }
    if (options.expectCt === undefined) {
        middlewareFunctions.push(expect_ct_1.default());
    }
    else if (options.expectCt !== false) {
        middlewareFunctions.push(expect_ct_1.default(options.expectCt));
    }
    if (options.frameguard === undefined) {
        middlewareFunctions.push(x_frame_options_1.default());
    }
    else if (options.frameguard !== false) {
        middlewareFunctions.push(x_frame_options_1.default(options.frameguard));
    }
    if (options.hidePoweredBy !== false) {
        if (options.hidePoweredBy !== undefined) {
            console.warn("hidePoweredBy does not take options. Remove the property to silence this warning.");
        }
        middlewareFunctions.push(x_powered_by_1.default());
    }
    if (options.hsts === undefined) {
        middlewareFunctions.push(strict_transport_security_1.default());
    }
    else if (options.hsts !== false) {
        middlewareFunctions.push(strict_transport_security_1.default(options.hsts));
    }
    if (options.ieNoOpen !== false) {
        if (options.ieNoOpen !== undefined) {
            console.warn("ieNoOpen does not take options. Remove the property to silence this warning.");
        }
        middlewareFunctions.push(x_download_options_1.default());
    }
    if (options.noSniff !== false) {
        if (options.noSniff !== undefined) {
            console.warn("noSniff does not take options. Remove the property to silence this warning.");
        }
        middlewareFunctions.push(x_content_type_options_1.default());
    }
    if (options.permittedCrossDomainPolicies === undefined) {
        middlewareFunctions.push(x_permitted_cross_domain_policies_1.default());
    }
    else if (options.permittedCrossDomainPolicies !== false) {
        middlewareFunctions.push(x_permitted_cross_domain_policies_1.default(options.permittedCrossDomainPolicies));
    }
    if (options.referrerPolicy === undefined) {
        middlewareFunctions.push(referrer_policy_1.default());
    }
    else if (options.referrerPolicy !== false) {
        middlewareFunctions.push(referrer_policy_1.default(options.referrerPolicy));
    }
    if (options.xssFilter !== false) {
        if (options.xssFilter !== undefined) {
            console.warn("xssFilter does not take options. Remove the property to silence this warning.");
        }
        middlewareFunctions.push(x_xss_protection_1.default());
    }
    return function helmetMiddleware(req, res, next) {
        const iterator = middlewareFunctions[Symbol.iterator]();
        (function internalNext(err) {
            if (err) {
                next(err);
                return;
            }
            const iteration = iterator.next();
            if (iteration.done) {
                next();
            }
            else {
                const middlewareFunction = iteration.value;
                middlewareFunction(req, res, internalNext);
            }
        })();
    };
}
helmet.contentSecurityPolicy = content_security_policy_1.default;
helmet.dnsPrefetchControl = x_dns_prefetch_control_1.default;
helmet.expectCt = expect_ct_1.default;
helmet.frameguard = x_frame_options_1.default;
helmet.hidePoweredBy = x_powered_by_1.default;
helmet.hsts = strict_transport_security_1.default;
helmet.ieNoOpen = x_download_options_1.default;
helmet.noSniff = x_content_type_options_1.default;
helmet.permittedCrossDomainPolicies = x_permitted_cross_domain_policies_1.default;
helmet.referrerPolicy = referrer_policy_1.default;
helmet.xssFilter = x_xss_protection_1.default;
helmet.featurePolicy = () => {
    throw new Error("helmet.featurePolicy was removed because the Feature-Policy header is deprecated. If you still need this header, you can use the `feature-policy` module.");
};
helmet.hpkp = () => {
    throw new Error("helmet.hpkp was removed because the header has been deprecated. If you still need this header, you can use the `hpkp` module. For more, see <https://github.com/helmetjs/helmet/issues/180>.");
};
helmet.noCache = () => {
    throw new Error("helmet.noCache was removed. You can use the `nocache` module instead. For more, see <https://github.com/helmetjs/helmet/issues/215>.");
};
module.exports = helmet;
