import { useState, useEffect } from "react";
import { getProducts } from "../api.js";

function Card({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={"text-3xl font-bold mt-2 " + color}>{value}</div>
    </div>
  );
}

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // runs once when the page opens
  useEffect(() => {
    getProducts()
      .then((data) => {
        // data may be a list, or {items:[...]}. handle both.
        // const list = Array.isArray(data) ? data : (data.items || []);
        const list = data.products || (Array.isArray(data) ? data : []);
        setProducts(list);
      })
      .catch((e) => setError("Could not load products. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const total = products.length;
  const published = products.filter((p) => p.status === "published").length;
  const blocked = products.filter((p) => p.status === "blocked").length;
  const pending = products.filter((p) => p.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-4 gap-5">
        <Card label="Total Products" value={total} color="text-slate-800" />
        <Card label="Published" value={published} color="text-green-600" />
        <Card label="Blocked" value={blocked} color="text-red-600" />
        <Card label="Pending" value={pending} color="text-orange-500" />
      </div>
    </div>
  );
}

export default Dashboard;