import { IncomingMessage, ServerResponse } from "http";
declare function xDownloadOptions(): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default xDownloadOptions;
