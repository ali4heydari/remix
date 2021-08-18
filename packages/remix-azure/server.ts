import type {
  AzureFunction,
  Context,
  HttpRequest,
  HttpRequestHeaders
} from "@azure/functions";
import type { AppLoadContext, RequestInit, ServerBuild } from "@remix-run/node";
import {
  Headers,
  Request,
  createRequestHandler as createRemixRequestHandler
} from "@remix-run/node";

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action, such as
 * values that are generated by Express middleware like `req.session`.
 */
export interface GetLoadContextFunction {
  (req: HttpRequest): AppLoadContext;
}

export type RequestHandler = ReturnType<typeof createRequestHandler>;

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): AzureFunction {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (context: Context, req: HttpRequest) => {
    let request = createRemixRequest(req);
    let loadContext = getLoadContext ? getLoadContext(req) : undefined;

    let response = await handleRequest(request, loadContext);

    return {
      status: response.status,
      headers: response.headers.raw(),
      body: await response.text()
    };
  };
}

export function createRemixHeaders(
  requestHeaders: HttpRequestHeaders
): Headers {
  let headers = new Headers();

  for (let [key, value] of Object.entries(requestHeaders)) {
    if (!value) continue;
    headers.set(key, value);
  }

  return headers;
}

export function createRemixRequest(req: HttpRequest): Request {
  let url = req.headers["x-ms-original-url"]!;

  let init: RequestInit = {
    method: req.method || "GET",
    headers: createRemixHeaders(req.headers)
  };

  if (req.body && req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
  }

  return new Request(url, init);
}