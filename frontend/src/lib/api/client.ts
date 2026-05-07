import { ClientResponse, hc } from "hono/client";
import { ApiRoutes } from "@server/app";

export type ArgumentTypes<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type ExtractData<T> =
  T extends ClientResponse<infer Data, any, any> ? Data : never;

const devServer = "http://localhost:3333";
const prodServer = "https://capyapp.up.railway.app";

export const client = hc<ApiRoutes>(
  import.meta.env.DEV ? devServer : prodServer,
);
