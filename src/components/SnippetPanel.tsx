import { useState, useEffect, useCallback } from "react";
import { Code2 } from "lucide-react";
import { listSnippets, createSnippet, updateSnippet, deleteSnippet } from "../lib/ipc";
import type { Snippet } from "../lib/types";

interface Props {
  /** Vendor tab aktif, untuk filter snippet. Undefined = tampilkan semua. */
  activeVendor?: string;
  /** Callback saat user klik kirim snippet ke terminal. */
  onSend: (content: string) => void;
}

const VENDOR_LABELS: Record<string, string> = {
  all: "🌐 Semua",
  cisco_ios: "⚡ Cisco",
  cisco_ios_router: "🔵 Cisco Router",
  cisco_ios_switch: "⚡ Cisco Switch",
  mikrotik: "🔴 MikroTik",
  huawei_vrp: "🌸 Huawei",
  juniper_junos: "🍊 Juniper",
  linux: "🐧 Linux",
};

function generateId(): string {
  return `snp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function SnippetPanel({ activeVendor, onSend }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const load = useCallback(async () => {
    try {
      const vendor = filterVendor === "all" ? undefined : filterVendor;
      const data = await listSnippets(vendor);
      setSnippets(data);
    } catch (e) {
      console.error("Gagal memuat snippet:", e);
    }
  }, [filterVendor]);

  useEffect(() => { load(); }, [load]);

  // Sync filter ke vendor aktif tab (hanya saat mount atau vendor berubah dari luar)
  useEffect(() => {
    if (activeVendor && activeVendor !== "auto" && activeVendor !== "generic") {
      setFilterVendor(activeVendor);
    }
  }, [activeVendor]);

  const openAddForm = () => {
    setEditingSnippet(null);
    setFormName("");
    setFormContent("");
    setFormVendor(activeVendor && activeVendor !== "auto" ? activeVendor : "");
    setFormCategory("");
    setShowForm(true);
  };

  const openEditForm = (s: Snippet) => {
    setEditingSnippet(s);
    setFormName(s.name);
    setFormContent(s.content);
    setFormVendor(s.vendor ?? "");
    setFormCategory(s.category ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) return;
    const now = Math.floor(Date.now() / 1000);
    const snippet: Snippet = {
      id: editingSnippet?.id ?? generateId(),
      name: formName.trim(),
      content: formContent.trim(),
      vendor: formVendor.trim() || undefined,
      category: formCategory.trim() || undefined,
      created_at: editingSnippet?.created_at ?? now,
    };
    try {
      if (editingSnippet) {
        await updateSnippet(snippet);
      } else {
        await createSnippet(snippet);
      }
      setShowForm(false);
      load();
    } catch (e) {
      alert("Gagal menyimpan snippet: " + e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus snippet ini?")) return;
    try {
      await deleteSnippet(id);
      load();
    } catch (e) {
      alert("Gagal menghapus snippet: " + e);
    }
  };

  const handleSend = (content: string) => {
    const lines = content.split("\n").filter(l => l.trim());
    for (const line of lines) {
      onSend(line);
    }
  };

  return (
    <div className="snippet-panel">
      {/* Header */}
      <div className="snippet-panel-header">
        <span className="snippet-panel-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Code2 size={16} /> Snippet Library
        </span>
        <button className="snippet-add-btn" onClick={openAddForm} title="Tambah snippet baru">＋</button>
      </div>

      {/* Filter vendor */}
      <div className="snippet-filter-row">
        <select
          className="snippet-vendor-select"
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
        >
          <option value="all">🌐 Semua Vendor</option>
          {Object.entries(VENDOR_LABELS).filter(([k]) => k !== "all").map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Form tambah/edit */}
      {showForm && (
        <div className="snippet-form-overlay">
          <div className="snippet-form">
            <h4>{editingSnippet ? "✏️ Edit Snippet" : "＋ Snippet Baru"}</h4>
            <label>Nama</label>
            <input
              className="snippet-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="mis. Backup Config Cisco"
              autoFocus
            />
            <label>Command / Isi</label>
            <textarea
              className="snippet-textarea"
              rows={5}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={"show running-config\nwrite memory"}
            />
            <div className="snippet-form-row">
              <div style={{ flex: 1 }}>
                <label>Vendor (opsional)</label>
                <select
                  className="snippet-input"
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                >
                  <option value="">— Global (semua) —</option>
                  {Object.entries(VENDOR_LABELS).filter(([k]) => k !== "all").map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label>Kategori (opsional)</label>
                <input
                  className="snippet-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="mis. backup, troubleshoot"
                />
              </div>
            </div>
            <div className="snippet-form-actions">
              <button className="snippet-save-btn" onClick={handleSave}>💾 Simpan</button>
              <button className="snippet-cancel-btn" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* List snippet */}
      <div className="snippet-list">
        {snippets.length === 0 ? (
          <div className="snippet-empty">
            <span>📭 Belum ada snippet.</span>
            <button className="snippet-add-inline-btn" onClick={openAddForm}>+ Tambah sekarang</button>
          </div>
        ) : (
          snippets.map((s) => (
            <div key={s.id} className="snippet-item">
              <div className="snippet-item-header">
                <span className="snippet-item-name">{s.name}</span>
                {s.vendor && (
                  <span className="snippet-vendor-badge">
                    {VENDOR_LABELS[s.vendor] ?? s.vendor}
                  </span>
                )}
              </div>
              <pre className="snippet-item-content">{s.content}</pre>
              <div className="snippet-item-actions">
                <button
                  className="snippet-send-btn"
                  onClick={() => handleSend(s.content)}
                  title="Kirim ke terminal aktif"
                >▶ Kirim</button>
                <button
                  className="snippet-edit-btn"
                  onClick={() => openEditForm(s)}
                  title="Edit snippet"
                >✏️</button>
                <button
                  className="snippet-delete-btn"
                  onClick={() => handleDelete(s.id)}
                  title="Hapus snippet"
                >🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
