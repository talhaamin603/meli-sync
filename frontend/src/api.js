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

export async function updateProduct(id, data) {
  const res = await api.put(`/products/${id}`, data);
  return res.data;
}

export async function syncProduct(id) {
  const res = await api.post(`/meli/publish/${id}`);
  return res.data;
}

export async function deleteProduct(id) {
  const res = await api.delete(`/products/${id}`);
  return res.data;
}

// ---- MARGIN RULES ----
export async function getMarginRules() {
  const res = await api.get("/margin-rules");
  return res.data;
}

export async function updateMarginRules(rules) {
  const res = await api.put("/margin-rules", rules);
  return res.data;
}

// ---- RECYCLE BIN ----
export async function getRecycleBin() {
  const res = await api.get("/recycle-bin");
  return res.data;
}

export async function restoreProduct(id) {
  const res = await api.post(`/recycle-bin/${id}/restore`);
  return res.data;
}

export async function permanentDeleteProduct(id) {
  const res = await api.delete(`/recycle-bin/${id}`);
  return res.data;
}

export async function emptyRecycleBin() {
  const res = await api.delete("/recycle-bin");
  return res.data;
}

export async function restoreAllProducts() {
  const res = await api.post("/recycle-bin/restore-all");
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

export async function refetchImages() {
  const res = await api.post("/amazon/refetch-images");
  return res.data;
}

// ---- CATEGORIES ----
export async function getCategories() {
  const res = await api.get("/categories");
  return res.data;
}

export async function createCategory(name, parent_id = null) {
  const res = await api.post("/categories", { name, parent_id });
  return res.data;
}

export async function updateCategory(id, name) {
  const res = await api.put(`/categories/${id}`, { name });
  return res.data;
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
}

export async function searchAmazon(q, page = 1) {
  const res = await api.get("/amazon/search", { params: { q, page } });
  return res.data;
}

export async function addFromSearch(products, category_id) {
  const body = { products };
  if (category_id) body.category_id = category_id;
  const res = await api.post("/amazon/add-from-search", body);
  return res.data;
}

// ---- SYNC ----
export async function getSyncHistory() {
  const res = await api.get("/sync/history");
  return res.data;
}

// ---- EXCHANGE RATE ----
export async function getExchangeRate() {
  const res = await api.get("/meli/exchange-rate");
  return res.data;
}

// ---- ADMIN ----
export async function recalculatePrices() {
  const res = await api.post("/admin/recalculate-prices");
  return res.data;
}


export default api;