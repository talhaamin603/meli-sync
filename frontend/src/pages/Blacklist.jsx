import { useState, useEffect } from "react";
import { getBlacklist, addBlacklistTerm, deleteBlacklistTerm }
  from "../api.js";

function Blacklist() {
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState("");
  const [type, setType] = useState("brand");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // load the blacklist when the page opens
  function reload() {
    getBlacklist()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.items || []);
        setTerms(list);
      })
      .catch(() => setError("Could not load blacklist."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    if (!newTerm.trim()) return;
    try {
      await addBlacklistTerm({ rule_type: type, value: newTerm.trim() });
      setNewTerm("");
      reload();
    } catch { setError("Could not add term."); }
  }

  async function remove(id) {
    try {
      await deleteBlacklistTerm(id);
      reload();
    } catch { setError("Could not delete term."); }
  }

  if (loading) return <p>Loading blacklist...</p>;

  const filtered = terms.filter((t) =>
    (t.value || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Blacklist ({terms.length} terms)
      </h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded-lg shadow p-4 mb-5 flex gap-3">
        <input value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="New brand or keyword"
          className="border rounded px-3 py-2 flex-1" />
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="border rounded px-3 py-2">
          <option value="brand">Brand</option>
          <option value="keyword">Keyword</option>
        </select>
        <button onClick={add}
          className="bg-blue-600 text-white px-5 py-2 rounded
                     hover:bg-blue-700">Add</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search the 6,340 terms..."
        className="border rounded px-3 py-2 mb-4 w-72" />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Term</th>
              <th className="p-3">Type</th>
              <th className="p-3 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.value}</td>
                <td className="p-3">{t.rule_type}</td>
                <td className="p-3">
                  <button onClick={() => remove(t.id)}
                    className="text-red-600 hover:underline">
                    Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Showing {Math.min(filtered.length, 200)} of {filtered.length}
        matches (search to narrow down the full list).
      </p>
    </div>
  );
}

export default Blacklist;