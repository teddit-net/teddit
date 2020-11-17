import { IncomingMessage, ServerResponse } from "http";
export interface XPermittedCrossDomainPoliciesOptions {
    permittedPolicies?: string;
}
declare function xPermittedCrossDomainPolicies(options?: Readonly<XPermittedCrossDomainPoliciesOptions>): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xPermittedCrossDomainPolicies;
