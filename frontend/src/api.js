import axios from "axios";

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
// const API_URL = "https://meli-sync-production-99a3.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
});

// ---- PRODUCTS ----
export async function getProducts() {
  const res = await api.get("/products");
  return res.data;
}

export async function addManualProduct(product) {
  const res = await api.post("/manual/product", product);
  return res.data;
}

// ---- BLACKLIST ----
export async function getBlacklist() {
  const res = await api.get("/blacklist");
  return res.data;
}

export async function addBlacklistTerm(term) {
  const res = await api.post("/blacklist", term);
  return res.data;
}

export async function deleteBlacklistTerm(id) {
  const res = await api.delete(`/blacklist/${id}`);
  return res.data;
}

// ---- EXCHANGE RATE ----
export async function getExchangeRate() {
  const res = await api.get("/meli/exchange-rate");
  return res.data;
}

// ---- SETTINGS ----
export async function getSettings() {
  const res = await api.get("/settings");
  return res.data;
}

export async function updateSettings(settings) {
  const res = await api.put("/settings", settings);
  return res.data;
}

export default api;