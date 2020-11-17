import { IncomingMessage, ServerResponse } from "http";
export interface StrictTransportSecurityOptions {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
}
declare function strictTransportSecurity(options?: Readonly<StrictTransportSecurityOptions>): (_req: IncomingMessage, res: ServerResponse, next: () => void) => void;
export default strictTransportSecurity;
