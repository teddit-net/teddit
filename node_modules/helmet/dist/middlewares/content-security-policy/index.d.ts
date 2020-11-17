/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
interface ContentSecurityPolicyDirectiveValueFunction {
    (req: IncomingMessage, res: ServerResponse): string;
}
declare type ContentSecurityPolicyDirectiveValue = string | ContentSecurityPolicyDirectiveValueFunction;
interface ContentSecurityPolicyDirectives {
    [directiveName: string]: Iterable<ContentSecurityPolicyDirectiveValue>;
}
export interface ContentSecurityPolicyOptions {
    directives?: ContentSecurityPolicyDirectives;
    reportOnly?: boolean;
}
declare const getDefaultDirectives: () => {
    [x: string]: Iterable<ContentSecurityPolicyDirectiveValue>;
};
declare function contentSecurityPolicy(options?: Readonly<ContentSecurityPolicyOptions>): (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void) => void;
declare namespace contentSecurityPolicy {
    var getDefaultDirectives: () => {
        [x: string]: Iterable<ContentSecurityPolicyDirectiveValue>;
    };
}
export default contentSecurityPolicy;
export { getDefaultDirectives };
