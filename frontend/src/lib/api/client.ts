import { ClientResponse, hc } from "hono/client";
import { ApiRoutes } from "../../../../app";

export type ArgumentTypes<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type ExtractData<T> =
  T extends ClientResponse<infer Data, any, any> ? Data : never;

export const client = hc<ApiRoutes>("http://localhost:3333");
