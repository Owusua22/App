// utils/media.js
import { LAMBDA_BASE_URL } from "./lambdaClient";

// MUST match your Lambda route
const LAMBDA_PRODUCT_IMAGE_BASE = `${LAMBDA_BASE_URL}/media/products-images`;

export function buildProductImageUri(productImage) {
  if (!productImage) return null;

  const raw = String(productImage).trim();
  if (!raw) return null;

  const filePart = raw.split(/[\\/]/).pop()?.split("?")[0]?.trim();
  if (!filePart) return null;

  let decoded = filePart;
  try { decoded = decodeURIComponent(filePart); } catch {}

  return `${LAMBDA_PRODUCT_IMAGE_BASE}/${encodeURIComponent(decoded)}`;
}