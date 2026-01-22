// axiosInstance.js
import axios from "axios";

// Your Lambda / API Gateway URL (no trailing slash needed)
const LAMBDA_BASE_URL =
  "https://02yo3gbfxe.execute-api.us-east-1.amazonaws.com/default/FrankoAPI";

// Same header your web uses to authorize/identify
const LAMBDA_HEADER_NAME = "Identifier";
const LAMBDA_HEADER_VALUE = "Franko";

const api = axios.create({
  baseURL: LAMBDA_BASE_URL,
  headers: {
    [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
  },
});

export default api;