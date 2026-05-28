import { useState, useEffect } from "react";
import { getProducts } from "../api.js";

function Badge({ status }) {
  const colors = {
    published: "bg-green-100 text-green-700",
    blocked: "bg-red-100 text-red-700",
    failed: "bg-orange-100 text-orange-700",
    pending: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={"px-2 py-1 rounded text-xs " +
                     (colors[status] || colors.pending)}>
      {status}
    </span>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then((data) => {
        const list = data.products || (Array.isArray(data) ? data : []);        setProducts(list);
      })
      .catch(() => setError("Could not load products. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const filtered = products.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Products ({products.length})
      </h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
        className="border rounded px-3 py-2 mb-4 w-72" />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">ASIN</th>
              <th className="p-3">Title</th>
              <th className="p-3">Price USD</th>
              <th className="p-3">Price COP</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id || p.asin} className="border-t">
                <td className="p-3 font-mono text-xs">{p.asin}</td>
                <td className="p-3">{p.title}</td>
                <td className="p-3">${p.amazon_price_usd}</td>
                <td className="p-3">
                  {p.converted_price_cop
                    ? Number(p.converted_price_cop).toLocaleString()
                    : "-"}
                </td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3"><Badge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-4 text-gray-500">No products found.</p>
        )}
      </div>
    </div>
  );
}

export default Products;