import { ClientResponse, hc } from "hono/client";
import { ApiRoutes } from "@server/app";
import { SERVER_URL } from "../serverUrl";

export type ArgumentTypes<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type ExtractData<T> =
  T extends ClientResponse<infer Data, any, any> ? Data : never;

// credentials: "include" ensures the httpOnly refresh-token cookie is sent
// on cross-origin requests during local dev (frontend and API on different ports).
export const client = hc<ApiRoutes>(SERVER_URL, {
  init: { credentials: "include" },
});
