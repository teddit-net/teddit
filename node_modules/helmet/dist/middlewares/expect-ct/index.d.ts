import { IncomingMessage, ServerResponse } from "http";
export interface ExpectCtOptions {
    maxAge?: number;
    enforce?: boolean;
    reportUri?: string;
}
declare function expectCt(options?: Readonly<ExpectCtOptions>): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default expectCt;
