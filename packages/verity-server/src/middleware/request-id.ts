import { createId } from "@paralleldrive/cuid2";
import type { IncomingMessage, ServerResponse } from "node:http";

export function attachRequestId(
  _req: IncomingMessage,
  res: ServerResponse,
): string {
  const requestId = createId();
  res.setHeader("X-Request-Id", requestId);
  return requestId;
}
