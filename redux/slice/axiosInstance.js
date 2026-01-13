import axios from "axios";

const API_KEY_NAME = "x-api-key";
const API_KEY_VALUE = "E91D5646-FB6C-4AD5-9420-2CA2A8539B6C";

const api = axios.create({
  baseURL: "https://fte002n1.salesmate.app",
  headers: {
    "Content-Type": "application/json",
    [API_KEY_NAME]: API_KEY_VALUE, // dynamically add API key
  },

});

export default api;
