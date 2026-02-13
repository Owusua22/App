// utils/lambdaClient.js
import api from "../redux/slice/axiosInstance";

export const LAMBDA_BASE_URL = String(api?.defaults?.baseURL || "").replace(/\/$/, "");

/**
 * Extract default headers from axios instance (only string values).
 * This gives you { Identifier: "Franko", ... } without duplicating it.
 */
export function getLambdaHeaders() {
  const headers = api?.defaults?.headers;
  const out = {};

  // axios stores custom headers typically in headers.common
  const common = headers?.common && typeof headers.common === "object" ? headers.common : null;

  const sources = [
    common,
    headers && typeof headers === "object" ? headers : null,
  ].filter(Boolean);

  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
  }

  return out;
}