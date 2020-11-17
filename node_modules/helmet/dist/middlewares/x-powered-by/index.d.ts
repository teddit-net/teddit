import { IncomingMessage, ServerResponse } from "http";
declare function xPoweredBy(): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xPoweredBy;
