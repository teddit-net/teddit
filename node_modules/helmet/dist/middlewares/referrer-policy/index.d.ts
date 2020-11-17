import { IncomingMessage, ServerResponse } from "http";
export interface ReferrerPolicyOptions {
    policy?: string | string[];
}
declare function referrerPolicy(options?: Readonly<ReferrerPolicyOptions>): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default referrerPolicy;
