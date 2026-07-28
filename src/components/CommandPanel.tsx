// Dedicated Panel: Command Recommendations (Rekomendasi command kontekstual per vendor & OS)

import { useState } from "react";
import { Zap, Plus, Trash2, X, Bookmark, Activity, RefreshCw } from "lucide-react";
import type { DeviceVendor } from "../lib/types";
import { VENDOR_MAP, VENDOR_PRESETS } from "../lib/deviceDetection";

export interface CommandEntry {
  command: string;
  count: number;
  category: "network" | "system" | "custom";
  vendor?: DeviceVendor;
  lastUsed: number;
}

const NETWORK_PREFIXES = [
  "show", "ping", "traceroute", "ip", "interface", "configure", "enable",
  "router", "no ", "exit", "end", "write", "copy", "reload", "vlan",
  "switchport", "access-list", "route-map", "bgp", "ospf", "eigrp",
  "spanning-tree", "nslookup", "dig", "ifconfig", "netstat", "ss",
  "iptables", "nft", "ip route", "ip addr", "curl", "wget", "display",
];
const SYSTEM_PREFIXES = [
  "ls", "cd", "pwd", "cat", "grep", "find", "top", "htop", "ps",
  "mkdir", "rm", "cp", "mv", "chmod", "chown", "df", "du", "mount",
  "umount", "apt", "yum", "dnf", "systemctl", "journalctl", "tail",
  "head", "nano", "vim", "vi", "less", "more", "echo", "export",
  "source", "bash", "sh", "sudo", "su", "man", "which", "whoami",
  "uname", "uptime", "free", "kill", "pkill", "tar", "gzip", "unzip",
  "ssh", "scp", "rsync", "docker", "git",
];

export function detectCategory(cmd: string): "network" | "system" | "custom" {
  const lower = cmd.toLowerCase().trim();
  if (NETWORK_PREFIXES.some((p) => lower.startsWith(p))) return "network";
  if (SYSTEM_PREFIXES.some((p) => lower.startsWith(p))) return "system";
  return "custom";
}

const STORAGE_KEY = "remote_app_command_history";

export function loadCommandHistory(): CommandEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCommandHistory(entries: CommandEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function recordCommand(cmd: string, vendor?: DeviceVendor): CommandEntry[] {
  const trimmed = cmd.trim();
  if (!trimmed || trimmed.length < 2) return loadCommandHistory();
  const history = loadCommandHistory();
  const existing = history.find((e) => e.command === trimmed);
  if (existing) {
    existing.count += 1;
    existing.lastUsed = Date.now();
    if (vendor && vendor !== "generic" && vendor !== "auto") {
      existing.vendor = vendor;
    }
  } else {
    history.push({
      command: trimmed,
      count: 1,
      category: detectCategory(trimmed),
      vendor: vendor && vendor !== "auto" ? vendor : undefined,
      lastUsed: Date.now(),
    });
  }
  saveCommandHistory(history);
  return history;
}

interface CommandPanelProps {
  onClose: () => void;
  history: CommandEntry[];
  activeVendor?: DeviceVendor;
  onVendorChange?: (vendor: DeviceVendor) => void;
  onRedetectVendor?: () => void;
  onSend: (cmd: string) => void;
  onDelete: (cmd: string) => void;
  onAdd: (cmd: string) => void;
}

export function CommandPanel({
  onClose,
  history,
  activeVendor = "generic",
  onVendorChange,
  onRedetectVendor,
  onSend,
  onDelete,
  onAdd,
}: CommandPanelProps) {
  const [newCmd, setNewCmd] = useState("");
  const [viewMode, setViewMode] = useState<"presets" | "history">("presets");

  const vendorInfo = VENDOR_MAP[activeVendor] || VENDOR_MAP.generic;
  const presets = VENDOR_PRESETS[activeVendor] || [];
  const sortedHistory = [...history].sort((a, b) => b.count - a.count);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCmd.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewCmd("");
    }
  };

  return (
    <div className="right-panel command-panel">
      {/* Header */}
      <div className="rp-header">
        <div className="rp-title">
          <Zap size={14} className="rp-title-icon zap-icon" />
          <span>Rekomendasi Command</span>
        </div>
        <button className="rp-close" onClick={onClose} title="Tutup Panel Command">
          <X size={14} />
        </button>
      </div>

      {/* Vendor Badge Bar dengan Dropdown Ganti Vendor Per Tab */}
      <div className="vendor-badge-bar" style={{ borderColor: vendorInfo.color }}>
        <select
          className="vendor-select-dropdown"
          value={activeVendor}
          onChange={(e) => onVendorChange?.(e.target.value as DeviceVendor)}
          style={{ color: vendorInfo.color, borderColor: `${vendorInfo.color}40` }}
          title="Klik untuk memilih/mengganti vendor untuk tab ini"
        >
          <option value="cisco_ios_switch">⚡ Cisco Switch</option>
          <option value="cisco_ios_router">🔵 Cisco Router</option>
          <option value="cisco_nxos">🔷 Cisco NX-OS</option>
          <option value="mikrotik">🟢 MikroTik RouterOS</option>
          <option value="huawei_vrp">🔴 Huawei VRP</option>
          <option value="juniper_junos">🟣 Juniper JunOS</option>
          <option value="linux">🐧 Linux / Unix</option>
          <option value="generic">⚡ Generic Terminal</option>
        </select>

        {onRedetectVendor && (
          <button
            className="vendor-redetect-btn"
            onClick={onRedetectVendor}
            title="Ulangi Deteksi Otomatis Perangkat"
          >
            <RefreshCw size={11} /> Auto
          </button>
        )}
      </div>

      {/* Sub-Tabs: Pemisahan Antara Preset Vendor & Sering Digunakan */}
      <div className="rp-view-tabs">
        <button
          className={`rp-view-tab ${viewMode === "presets" ? "active" : ""}`}
          onClick={() => setViewMode("presets")}
        >
          <Bookmark size={12} /> Preset {vendorInfo.name}
        </button>
        <button
          className={`rp-view-tab ${viewMode === "history" ? "active" : ""}`}
          onClick={() => setViewMode("history")}
        >
          <Activity size={12} /> Sering Digunakan ({sortedHistory.length})
        </button>
      </div>

      {/* Body */}
      <div className="rp-body">
        <div className="rp-commands">
          {/* Mode 1: Preset Commands Bawaan Per Vendor */}
          {viewMode === "presets" && (
            <div className="rp-cmd-category">
              {presets.length === 0 ? (
                <div className="rp-cmd-empty">
                  <Bookmark size={24} />
                  <p>Tidak ada preset khusus untuk vendor ini.</p>
                </div>
              ) : (
                <div className="preset-grid">
                  {presets.map((preset) => (
                    <div key={preset.command} className="rp-cmd-item preset-item">
                      <button
                        className="rp-cmd-send"
                        onClick={() => onSend(preset.command)}
                        title={`Kirim ke terminal: ${preset.command}`}
                      >
                        <div className="preset-item-info">
                          <code className="rp-cmd-text">{preset.command}</code>
                          <span className="preset-label">{preset.label}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Command History / Sering Digunakan */}
          {viewMode === "history" && (
            <div className="rp-cmd-category">
              <div className="rp-cmd-list">
                {sortedHistory.length === 0 && (
                  <div className="rp-cmd-empty">
                    <Zap size={24} />
                    <p>Belum ada riwayat command.</p>
                    <p className="rp-cmd-empty-hint">
                      Ketik command di terminal atau tambahkan manual di bawah.
                    </p>
                  </div>
                )}
                {sortedHistory.map((entry) => (
                  <div key={entry.command} className="rp-cmd-item">
                    <button
                      className="rp-cmd-send"
                      onClick={() => onSend(entry.command)}
                      title={`Kirim ke terminal: ${entry.command}`}
                    >
                      <code className="rp-cmd-text">{entry.command}</code>
                      <span className="rp-cmd-count">{entry.count}×</span>
                    </button>
                    <button
                      className="rp-cmd-delete"
                      onClick={() => onDelete(entry.command)}
                      title="Hapus command ini"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add command */}
          <form className="rp-cmd-add" onSubmit={handleAdd}>
            <input
              className="rp-cmd-add-input"
              type="text"
              placeholder="Tambah command manual..."
              value={newCmd}
              onChange={(e) => setNewCmd(e.target.value)}
              spellCheck={false}
            />
            <button
              type="submit"
              className="rp-cmd-add-btn"
              disabled={!newCmd.trim()}
              title="Tambah ke rekomendasi"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
