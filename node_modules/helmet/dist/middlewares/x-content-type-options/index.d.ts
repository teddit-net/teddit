import { IncomingMessage, ServerResponse } from "http";
declare function xContentTypeOptions(): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xContentTypeOptions;
