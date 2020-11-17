import { IncomingMessage, ServerResponse } from "http";
declare function xXssProtection(): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xXssProtection;
