import { useState, useEffect, useRef } from "react";
import { Search, Terminal, Code2, Settings, Download, Upload, Plus, Monitor } from "lucide-react";
import type { Profile } from "../lib/types";
import { listProfiles, listSnippets, exportProfilesToFile, importProfilesFromFile } from "../lib/ipc";
import { useTranslation } from "../lib/i18n";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectProfile: (profile: Profile) => void;
  onSendSnippet?: (code: string) => void;
  onOpenNewSession: () => void;
  onOpenLocalTerminal: () => void;
  onOpenSettings: () => void;
  onToggleSnippets: () => void;
  onToggleCommands: () => void;
  onToggleSearch: () => void;
  onToggleSidebar: () => void;
  onRefreshProfiles: () => void;
}

interface PaletteItem {
  id: string;
  category: "Profil" | "Snippet" | "Aksi Aplikasi";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onConnectProfile,
  onSendSnippet,
  onOpenNewSession,
  onOpenLocalTerminal,
  onOpenSettings,
  onToggleSnippets,
  onToggleCommands,
  onToggleSearch,
  onToggleSidebar,
  onRefreshProfiles,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);

    setTimeout(() => inputRef.current?.focus(), 50);

    Promise.all([listProfiles().catch(() => []), listSnippets().catch(() => [])]).then(
      ([profiles, snippets]) => {
        const list: PaletteItem[] = [];

        // 1. Aksi Aplikasi
        list.push(
          {
            id: "act-new-session",
            category: "Aksi Aplikasi",
            title: "Sesi Baru",
            subtitle: "Buka dialog koneksi manual (SSH, Telnet, Serial, FTP)",
            icon: <Plus size={16} />,
            action: () => {
              onClose();
              onOpenNewSession();
            },
          },
          {
            id: "act-local-term",
            category: "Aksi Aplikasi",
            title: "Terminal Lokal (PTY)",
            subtitle: "Buka terminal shell OS bawaan di tab baru",
            icon: <Terminal size={16} />,
            action: () => {
              onClose();
              onOpenLocalTerminal();
            },
          },
          {
            id: "act-snippets",
            category: "Aksi Aplikasi",
            title: "Snippet / Macro Manager",
            subtitle: "Buka panel library command tersimpan",
            icon: <Code2 size={16} />,
            action: () => {
              onClose();
              onToggleSnippets();
            },
          },
          {
            id: "act-commands",
            category: "Aksi Aplikasi",
            title: "Rekomendasi Perintah Vendor",
            subtitle: "Buka panel preset command vendor",
            icon: <Terminal size={16} />,
            action: () => {
              onClose();
              onToggleCommands();
            },
          },
          {
            id: "act-search",
            category: "Aksi Aplikasi",
            title: "Cari Teks di Terminal",
            subtitle: "Buka panel pencarian teks output (🔍)",
            icon: <Search size={16} />,
            action: () => {
              onClose();
              onToggleSearch();
            },
          },
          {
            id: "act-sidebar",
            category: "Aksi Aplikasi",
            title: "Toggle Sidebar",
            subtitle: "Sembunyikan atau tampilkan sidebar kiri",
            icon: <Monitor size={16} />,
            action: () => {
              onClose();
              onToggleSidebar();
            },
          },
          {
            id: "act-settings",
            category: "Aksi Aplikasi",
            title: "Pengaturan Aplikasi",
            subtitle: "Pengaturan tema, font, dan default logging",
            icon: <Settings size={16} />,
            action: () => {
              onClose();
              onOpenSettings();
            },
          },
          {
            id: "act-export",
            category: "Aksi Aplikasi",
            title: "Ekspor Profil ke JSON",
            subtitle: "Simpan daftar profil ke file JSON (tanpa password)",
            icon: <Download size={16} />,
            action: async () => {
              onClose();
              try {
                const path = await exportProfilesToFile();
                if (path) alert(`Profil berhasil diekspor ke:\n${path}`);
              } catch (e) {
                alert("Gagal ekspor: " + e);
              }
            },
          },
          {
            id: "act-import",
            category: "Aksi Aplikasi",
            title: "Impor Profil dari JSON",
            subtitle: "Muat daftar profil dari file JSON",
            icon: <Upload size={16} />,
            action: async () => {
              onClose();
              try {
                const count = await importProfilesFromFile();
                if (count !== null) {
                  alert(`Berhasil mengimpor ${count} profil!`);
                  onRefreshProfiles();
                }
              } catch (e) {
                alert("Gagal impor: " + e);
              }
            },
          }
        );

        // 2. Profil
        profiles.forEach((p) => {
          list.push({
            id: `prof-${p.id}`,
            category: "Profil",
            title: p.name,
            subtitle: `${p.protocol.toUpperCase()} • ${p.host || p.serial_port || "local"}${
              p.group_path ? ` (${p.group_path})` : ""
            }`,
            icon: <Monitor size={16} />,
            action: () => {
              onClose();
              onConnectProfile(p);
            },
          });
        });

        // 3. Snippets
        snippets.forEach((s) => {
          const vendorStr = s.vendor ? s.vendor.toUpperCase() : "GLOBAL";
          list.push({
            id: `snip-${s.id}`,
            category: "Snippet",
            title: s.name,
            subtitle: `Vendor: ${vendorStr} • ${s.content.replace(/\n/g, " ; ")}`,
            icon: <Code2 size={16} />,
            action: () => {
              onClose();
              if (onSendSnippet) {
                onSendSnippet(s.content);
              } else {
                alert(`Snippet "${s.name}":\n${s.content}`);
              }
            },
          });
        });

        setItems(list);
      }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-palette-input-wrap">
          <Search size={18} className="cmd-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder={t.palettePlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="cmd-palette-badge">Ctrl+K</span>
        </div>

        <div className="cmd-palette-results">
          {filtered.length === 0 ? (
            <div className="cmd-palette-empty">Tidak ada hasil untuk "{query}"</div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-palette-item ${isSelected ? "selected" : ""}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-palette-item-icon">{item.icon}</div>
                  <div className="cmd-palette-item-text">
                    <span className="cmd-palette-item-title">{item.title}</span>
                    {item.subtitle && <span className="cmd-palette-item-sub">{item.subtitle}</span>}
                  </div>
                  <span className="cmd-palette-item-cat">{item.category}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
