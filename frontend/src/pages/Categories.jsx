import { useState, useEffect, useRef } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api.js";

function SearchableSelect({ options, value, onChange, placeholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.id) === String(value));
  const filtered = options.filter(o => o.name.toLowerCase().startsWith(query.toLowerCase()));

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(opt) {
    onChange(String(opt.id));
    setOpen(false);
    setQuery("");
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger / input */}
      {open ? (
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type to filter…"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: "#1a2235", color: "#e8ecf2", border: "1px solid rgba(80,160,250,0.5)" }}
        />
      ) : (
        <div
          onClick={handleOpen}
          className="w-full rounded-lg px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer"
          style={{ background: "#1a2235", color: selected ? "#e8ecf2" : "#4a5568", border: "1px solid rgba(80,160,250,0.28)" }}
        >
          <span>{selected ? selected.name : placeholder}</span>
          <div className="flex items-center gap-1">
            {selected && (
              <button onClick={handleClear} className="hover:text-red-400 transition-colors" tabIndex={-1}>
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" style={{ color: "#4a5568" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-xl"
          style={{ background: "#1a2235", border: "1px solid rgba(80,160,250,0.25)", maxHeight: 200, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm" style={{ color: "#4a5568" }}>No match for "{query}"</div>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.id}
                onMouseDown={() => handleSelect(opt)}
                className="px-3 py-2.5 text-sm cursor-pointer transition-colors"
                style={{
                  color: String(opt.id) === String(value) ? "#50A0FA" : "#e8ecf2",
                  background: String(opt.id) === String(value) ? "rgba(80,160,250,0.1)" : "transparent",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(80,160,250,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = String(opt.id) === String(value) ? "rgba(80,160,250,0.1)" : "transparent"}
              >
                {opt.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function buildTree(flat) {
  const map = {};
  flat.forEach(c => (map[c.id] = { ...c, children: [] }));
  const roots = [];
  flat.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  const sort = nodes => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(n => sort(n.children));
    return nodes;
  };
  return sort(roots);
}

function getPath(id, flat) {
  const map = {};
  flat.forEach(c => (map[c.id] = c));
  const parts = [];
  let cur = map[id];
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? map[cur.parent_id] : null;
  }
  return parts.join(" > ");
}

function flatOptions(tree, depth = 0) {
  const result = [];
  for (const node of tree) {
    result.push({ id: node.id, label: " ".repeat(depth * 4) + node.name, depth });
    if (node.children?.length) result.push(...flatOptions(node.children, depth + 1));
  }
  return result;
}

// Returns the ordered list of nodes currently visible (respecting collapsed state)
function getVisibleNodes(nodes, expandedIds) {
  const result = [];
  for (const node of nodes) {
    result.push(node);
    if (expandedIds.has(node.id) && node.children?.length) {
      result.push(...getVisibleNodes(node.children, expandedIds));
    }
  }
  return result;
}

function TreeNode({ node, flat, onDelete, onEdit, depth = 0, expandedIds, onToggle, focusedId, onFocus }) {
  const expanded = expandedIds.has(node.id);
  const hasChildren = node.children?.length > 0;
  const isFocused = focusedId === node.id;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(node.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) { setEditVal(node.name); setTimeout(() => inputRef.current?.select(), 0); }
  }, [editing]);

  async function commitEdit() {
    const trimmed = editVal.trim();
    if (!trimmed || trimmed === node.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await onEdit(node.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        data-node-id={node.id}
        className="flex items-center gap-2 group py-1.5 px-2 rounded-lg transition-colors"
        style={{
          paddingLeft: depth * 20 + 8,
          background: isFocused ? "rgba(80,160,250,0.12)" : undefined,
          outline: isFocused ? "1px solid rgba(80,160,250,0.3)" : undefined,
          cursor: "default",
        }}
        onClick={() => !editing && onFocus(node.id)}
      >
        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          style={{ color: "#4a5568", visibility: hasChildren ? "visible" : "hidden" }}
          tabIndex={-1}
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Folder / leaf icon */}
        <svg width="14" height="14" fill="none" stroke={depth === 0 ? "#50A0FA" : "#6b7785"} viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0">
          {hasChildren
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h4" />
          }
        </svg>

        {/* Name or inline edit input */}
        {editing ? (
          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 rounded px-2 py-0.5 text-sm text-[#e8ecf2] outline-none min-w-0"
              style={{ background: "rgba(80,160,250,0.1)", border: "1px solid rgba(80,160,250,0.4)" }}
              disabled={saving}
            />
            <button onClick={commitEdit} disabled={saving} tabIndex={-1}
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 hover:bg-green-500/20"
              style={{ color: "#22c55e" }} title="Save">
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} tabIndex={-1}
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 hover:bg-red-500/20"
              style={{ color: "#6b7785" }} title="Cancel">
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <span
            className={`flex-1 text-sm${hasChildren ? " cursor-pointer select-none hover:text-white" : ""}`}
            style={{ color: isFocused ? "#e8ecf2" : depth === 0 ? "#e8ecf2" : "#a0adbb" }}
            onClick={hasChildren ? e => { e.stopPropagation(); onFocus(node.id); onToggle(node.id); } : undefined}
          >
            {node.name}
          </span>
        )}

        {/* Full path badge on hover */}
        {!editing && depth > 0 && (
          <span className="hidden group-hover:inline-flex text-[9px] px-1.5 py-0.5 rounded mr-1 truncate max-w-[200px]"
            style={{ background: "rgba(80,160,250,0.08)", color: "#4a5568" }}>
            {getPath(node.id, flat)}
          </span>
        )}

        {/* Edit */}
        {!editing && (
          <button
            onClick={e => { e.stopPropagation(); setEditing(true); }}
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-blue-500/20 transition-colors"
            style={{ color: "#50A0FA" }}
            title="Rename category"
            tabIndex={-1}
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Delete */}
        {!editing && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(node); }}
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-red-500/20 transition-colors"
            style={{ color: "#ef4444" }}
            title="Delete category"
            tabIndex={-1}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div style={{ borderLeft: "1px solid rgba(80,160,250,0.08)", marginLeft: depth * 20 + 18 }}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} flat={flat} onDelete={onDelete} onEdit={onEdit} depth={depth + 1}
              expandedIds={expandedIds} onToggle={onToggle} focusedId={focusedId} onFocus={onFocus} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const [flat, setFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainName, setMainName] = useState("");
  const [mainError, setMainError] = useState("");
  const [mainSaving, setMainSaving] = useState(false);
  const [subName, setSubName] = useState("");
  const [subParentId, setSubParentId] = useState("");
  const [subError, setSubError] = useState("");
  const [subSaving, setSubSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [focusedId, setFocusedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const treeRef = useRef(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const data = await getCategories();
      setFlat(data);
    } catch {
      showToast("Failed to load categories.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Scroll focused node into view whenever focusedId changes
  useEffect(() => {
    if (focusedId == null || !treeRef.current) return;
    const el = treeRef.current.querySelector(`[data-node-id="${focusedId}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId]);

  async function handleEdit(id, newName) {
    try {
      await updateCategory(id, newName);
      showToast("Category renamed.");
      load();
    } catch (err) {
      showToast(err?.response?.data?.detail || "Rename failed.", false);
      throw err;
    }
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleKeyDown(e) {
    if (e.target.tagName === "INPUT") return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
      e.preventDefault();
    } else {
      return;
    }

    const tree = buildTree(flat);
    const visible = getVisibleNodes(tree, expandedIds);
    if (!visible.length) return;

    const idx = focusedId != null ? visible.findIndex(n => n.id === focusedId) : -1;
    const cur = visible[idx];

    switch (e.key) {
      case "ArrowDown":
        setFocusedId(visible[idx === -1 ? 0 : Math.min(idx + 1, visible.length - 1)].id);
        break;
      case "ArrowUp":
        setFocusedId(visible[idx <= 0 ? 0 : idx - 1].id);
        break;
      case "ArrowRight":
        if (cur?.children?.length) {
          setExpandedIds(prev => new Set([...prev, cur.id]));
        }
        break;
      case "Enter":
      case " ":
        if (cur?.children?.length) {
          toggleExpand(cur.id);
        }
        break;
      case "ArrowLeft":
        if (cur) {
          setExpandedIds(prev => { const s = new Set(prev); s.delete(cur.id); return s; });
        }
        break;
    }
  }

  async function handleAddMain(e) {
    e.preventDefault();
    if (!mainName.trim()) { setMainError("Name is required."); return; }
    setMainError("");
    setMainSaving(true);
    try {
      await createCategory(mainName.trim(), null);
      setMainName("");
      showToast("Main category added.");
      load();
    } catch (err) {
      setMainError(err?.response?.data?.detail || "Failed to add category.");
    } finally {
      setMainSaving(false);
    }
  }

  async function handleAddSub(e) {
    e.preventDefault();
    if (!subParentId) { setSubError("Select a parent category."); return; }
    if (!subName.trim()) { setSubError("Name is required."); return; }
    setSubError("");
    setSubSaving(true);
    try {
      await createCategory(subName.trim(), parseInt(subParentId));
      setSubName("");
      setSubParentId("");
      showToast("Subcategory added.");
      load();
    } catch (err) {
      setSubError(err?.response?.data?.detail || "Failed to add subcategory.");
    } finally {
      setSubSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(confirmDelete.id);
      showToast(`"${confirmDelete.name}" deleted.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.detail || "Delete failed.", false);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const tree = buildTree(flat);
  const options = flatOptions(tree);

  return (
    <div className="max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{
            background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: toast.ok ? "#22c55e" : "#ef4444",
          }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ background: "#0f1623", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 40px rgba(239,68,68,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <p className="text-white font-semibold mb-2">Delete "{confirmDelete.name}"?</p>
            <p className="text-[#6b7785] text-sm mb-5">
              This will permanently remove the category. You cannot delete a category that has subcategories.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}>
                Cancel
              </button>
              <button onClick={handleConfirmDelete} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 fade-up">
        <h1 className="text-2xl font-medium text-white mb-1">Categories</h1>
        <p className="text-sm text-[#6b7785]">Manage your product category hierarchy.</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── Tree panel ── */}
        <div className="flex-1 card rounded-xl overflow-hidden" style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(80,160,250,0.08)" }}>
            <span className="text-sm font-semibold text-white">Category Tree</span>
            <div className="flex items-center gap-2">
              {!searchQuery && <span className="text-[10px] text-[#3a4250]">↑↓ ← →</span>}
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA" }}>
                {flat.length} {flat.length === 1 ? "category" : "categories"}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(80,160,250,0.15)" }}>
              <svg width="13" height="13" fill="none" stroke="#4a5568" viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search categories…"
                className="flex-1 bg-transparent text-sm text-[#e8ecf2] outline-none placeholder-[#3a4250]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#4a5568] hover:text-[#e8ecf2] transition-colors" tabIndex={-1}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Tree or search results */}
          <div
            ref={treeRef}
            className="p-3 min-h-[300px] outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={() => !searchQuery && treeRef.current?.focus()}
          >
            {loading ? (
              <div className="text-[#4a5568] text-sm p-4">Loading…</div>
            ) : searchQuery.trim() ? (
              (() => {
                const q = searchQuery.toLowerCase();
                const results = flat.filter(c => c.name.toLowerCase().includes(q))
                  .sort((a, b) => {
                    const aMain = a.parent_id === null;
                    const bMain = b.parent_id === null;
                    if (aMain !== bMain) return aMain ? -1 : 1;
                    return a.name.localeCompare(b.name);
                  });
                if (results.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-10 text-[#4a5568]">
                    <p className="text-sm">No results for "{searchQuery}"</p>
                  </div>
                );
                return results.map(c => {
                  const isMain = c.parent_id === null;
                  const nameLower = c.name.toLowerCase();
                  const idx = nameLower.indexOf(q);
                  const highlighted = idx === -1 ? c.name : (
                    <>{c.name.slice(0, idx)}<span style={{ color: "#50A0FA", fontWeight: 600 }}>{c.name.slice(idx, idx + q.length)}</span>{c.name.slice(idx + q.length)}</>
                  );
                  return (
                    <div key={c.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
                      <svg width="14" height="14" fill="none" stroke={isMain ? "#50A0FA" : "#6b7785"} viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0">
                        {isMain
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h4" />
                        }
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: isMain ? "#e8ecf2" : "#a0adbb" }}>{highlighted}</p>
                        {!isMain && (
                          <p className="text-[11px] truncate mt-0.5" style={{ color: "#a0adbb" }}>
                            <span style={{ color: "#50A0FA", opacity: 0.7 }}>↳ </span>{getPath(c.id, flat)}
                          </p>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation();
                          const newName = window.prompt("Rename category:", c.name);
                          if (newName && newName.trim() && newName.trim() !== c.name) handleEdit(c.id, newName.trim());
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-blue-500/20 transition-colors"
                        style={{ color: "#50A0FA" }} title="Rename" tabIndex={-1}>
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(c); }}
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-red-500/20 transition-colors"
                        style={{ color: "#ef4444" }} title="Delete" tabIndex={-1}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  );
                });
              })()
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#4a5568]">
                <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" className="mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <p className="text-sm">No categories yet</p>
                <p className="text-xs mt-1">Add your first category using the form →</p>
              </div>
            ) : (
              tree.map(node => (
                <TreeNode key={node.id} node={node} flat={flat} onDelete={setConfirmDelete} onEdit={handleEdit}
                  expandedIds={expandedIds} onToggle={toggleExpand}
                  focusedId={focusedId} onFocus={setFocusedId} />
              ))
            )}
          </div>
        </div>

        {/* ── Add forms ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">

          {/* Add Main Category */}
          <div className="card rounded-xl p-5" style={{ animation: "fadeUp 0.5s ease-out 0.15s backwards" }}>
            <div className="flex items-center gap-2 mb-4">
              <svg width="14" height="14" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Add Main Category</h2>
            </div>
            <form onSubmit={handleAddMain} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
                  Name <span style={{ color: "#50A0FA" }}>*</span>
                </label>
                <input
                  value={mainName}
                  onChange={e => { setMainName(e.target.value); setMainError(""); }}
                  placeholder="e.g. Electronics"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${mainError ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}`,
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(80,160,250,0.5)"}
                  onBlur={e => e.target.style.borderColor = mainError ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}
                />
                {mainName && (
                  <p className="text-[10px] text-[#4a5568] mt-1">
                    Path: <span style={{ color: "#50A0FA" }}>{mainName}</span>
                  </p>
                )}
                {mainError && <p className="text-[11px] text-red-400 mt-1">{mainError}</p>}
              </div>
              <button
                type="submit"
                disabled={mainSaving || !mainName.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#50A0FA", color: "#0d1117", boxShadow: mainName.trim() ? "0 0 16px rgba(80,160,250,0.35)" : "none" }}
              >
                {mainSaving ? "Adding…" : "Add Main Category"}
              </button>
            </form>
          </div>

          {/* Add Subcategory */}
          <div className="card rounded-xl p-5" style={{ animation: "fadeUp 0.5s ease-out 0.2s backwards" }}>
            <div className="flex items-center gap-2 mb-4">
              <svg width="14" height="14" fill="none" stroke="#a78bfa" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h4" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Add Subcategory</h2>
            </div>
            <form onSubmit={handleAddSub} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
                  Parent Category <span style={{ color: "#50A0FA" }}>*</span>
                </label>
                <SearchableSelect
                  options={flat.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name))}
                  value={subParentId}
                  onChange={v => { setSubParentId(v); setSubError(""); }}
                  placeholder="Select parent category…"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
                  Name <span style={{ color: "#50A0FA" }}>*</span>
                </label>
                <input
                  value={subName}
                  onChange={e => { setSubName(e.target.value); setSubError(""); }}
                  placeholder="e.g. Earbuds"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${subError ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}`,
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(80,160,250,0.5)"}
                  onBlur={e => e.target.style.borderColor = subError ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}
                />
                {subParentId && subName && (
                  <p className="text-[10px] text-[#4a5568] mt-1">
                    Path: {getPath(parseInt(subParentId), flat)} &gt; <span style={{ color: "#a78bfa" }}>{subName}</span>
                  </p>
                )}
                {subError && <p className="text-[11px] text-red-400 mt-1">{subError}</p>}
              </div>
              <button
                type="submit"
                disabled={subSaving || !subName.trim() || !subParentId}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "rgba(167,139,250,0.85)", color: "#0d1117", boxShadow: (subName.trim() && subParentId) ? "0 0 16px rgba(167,139,250,0.3)" : "none" }}
              >
                {subSaving ? "Adding…" : "Add Subcategory"}
              </button>
            </form>
          </div>

          {/* Keyboard shortcuts */}
          <div className="rounded-xl p-4" style={{ background: "rgba(80,160,250,0.04)", border: "1px solid rgba(80,160,250,0.1)" }}>
            <p className="text-[11px] font-semibold text-[#6b7785] uppercase tracking-wider mb-2">Keyboard shortcuts</p>
            <div className="space-y-1 text-[11px] text-[#4a5568]">
              <p><span className="text-[#6b7785]">↑ / ↓</span> — move up / down</p>
              <p><span className="text-[#6b7785]">→</span> — expand</p>
              <p><span className="text-[#6b7785]">Enter / Space</span> — toggle expand/collapse</p>
              <p><span className="text-[#6b7785]">←</span> — collapse</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
