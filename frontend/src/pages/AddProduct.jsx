import { useState } from "react";
import { addManualProduct } from "../api.js";

function AddProduct() {
  const empty = {
    asin: "", title: "", description: "",
    image_url: "", amazon_price_usd: "", stock: 10, is_prime: true,
  };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit() {
    if (!form.asin.trim() || !form.title.trim()) {
      setMessage("ASIN and Title are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        amazon_price_usd: parseFloat(form.amazon_price_usd) || 0,
        stock: parseInt(form.stock) || 0,
      };
      const result = await addManualProduct(payload);
      setMessage(`Result: ${result.status} - ${result.reason || ""}`);
      if (result.status === "added") setForm(empty);
    } catch (e) {
      setMessage("Error saving. Check the backend is running.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">ASIN *</label>
            <input value={form.asin}
              onChange={(e) => update("asin", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="B00EXAMPLE1" />
          </div>
          <div>
            <label className="block text-sm mb-1">Price USD *</label>
            <input type="number" value={form.amazon_price_usd}
              onChange={(e) => update("amazon_price_usd", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="16.99" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Title *</label>
            <input value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <textarea value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Image URL</label>
            <input value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input type="number" value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex items-center mt-6">
            <input type="checkbox" checked={form.is_prime}
              onChange={(e) => update("is_prime", e.target.checked)}
              className="mr-2" />
            <label className="text-sm">Prime product</label>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving}
          className="mt-5 bg-blue-600 text-white px-5 py-2 rounded
                     hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Add Product"}
        </button>
        {message && (
          <div className="mt-3 text-sm bg-blue-50 p-3 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddProduct;