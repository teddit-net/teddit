import { IncomingMessage, ServerResponse } from "http";
import { ContentSecurityPolicyOptions } from "./middlewares/content-security-policy";
import { ExpectCtOptions } from "./middlewares/expect-ct";
import { ReferrerPolicyOptions } from "./middlewares/referrer-policy";
import strictTransportSecurity, { StrictTransportSecurityOptions } from "./middlewares/strict-transport-security";
import xContentTypeOptions from "./middlewares/x-content-type-options";
import xDnsPrefetchControl, { XDnsPrefetchControlOptions } from "./middlewares/x-dns-prefetch-control";
import xDownloadOptions from "./middlewares/x-download-options";
import xFrameOptions, { XFrameOptionsOptions } from "./middlewares/x-frame-options";
import xPermittedCrossDomainPolicies, { XPermittedCrossDomainPoliciesOptions } from "./middlewares/x-permitted-cross-domain-policies";
import xPoweredBy from "./middlewares/x-powered-by";
import xXssProtection from "./middlewares/x-xss-protection";
interface HelmetOptions {
    contentSecurityPolicy?: MiddlewareOption<ContentSecurityPolicyOptions>;
    dnsPrefetchControl?: MiddlewareOption<XDnsPrefetchControlOptions>;
    expectCt?: MiddlewareOption<ExpectCtOptions>;
    frameguard?: MiddlewareOption<XFrameOptionsOptions>;
    hidePoweredBy?: MiddlewareOption<never>;
    hsts?: MiddlewareOption<StrictTransportSecurityOptions>;
    ieNoOpen?: MiddlewareOption<never>;
    noSniff?: MiddlewareOption<never>;
    permittedCrossDomainPolicies?: MiddlewareOption<XPermittedCrossDomainPoliciesOptions>;
    referrerPolicy?: MiddlewareOption<ReferrerPolicyOptions>;
    xssFilter?: MiddlewareOption<never>;
}
declare type MiddlewareOption<T> = false | T;
declare function helmet(options?: Readonly<HelmetOptions>): (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void;
declare namespace helmet {
    var contentSecurityPolicy: typeof import("./middlewares/content-security-policy").default;
    var dnsPrefetchControl: typeof xDnsPrefetchControl;
    var expectCt: typeof import("./middlewares/expect-ct").default;
    var frameguard: typeof xFrameOptions;
    var hidePoweredBy: typeof xPoweredBy;
    var hsts: typeof strictTransportSecurity;
    var ieNoOpen: typeof xDownloadOptions;
    var noSniff: typeof xContentTypeOptions;
    var permittedCrossDomainPolicies: typeof xPermittedCrossDomainPolicies;
    var referrerPolicy: typeof import("./middlewares/referrer-policy").default;
    var xssFilter: typeof xXssProtection;
    var featurePolicy: () => never;
    var hpkp: () => never;
    var noCache: () => never;
}
export = helmet;
