import { IncomingMessage, ServerResponse } from "http";
export interface XDnsPrefetchControlOptions {
    allow?: boolean;
}
declare function xDnsPrefetchControl(options?: Readonly<XDnsPrefetchControlOptions>): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xDnsPrefetchControl;
