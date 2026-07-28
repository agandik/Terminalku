// Form koneksi SSH sederhana (Fase 1 + subset profil dasar D-11).
// Menyimpan host/port/user di memori sesi; kredensial belum di-keyring
// (itu Fase 5). Cukup untuk connect cepat tanpa ketik ulang tiap kali.

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import type { SshConfig } from "../lib/ipc";

type AuthMode = "password" | "key";

export function ConnectionForm({ onConnect }: { onConnect: (cfg: SshConfig) => void }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [password, setPassword] = useState("");
  const [keyPath, setKeyPath] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const handleBrowseKey = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: "Pilih File Private Key SSH",
        multiple: false,
        directory: false,
      });
      if (selected && typeof selected === "string") {
        setKeyPath(selected);
      }
    } catch (err) {
      console.error("Gagal membuka dialog file picker:", err);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !username) return;
    onConnect({
      host,
      port,
      username,
      password: authMode === "password" ? password : undefined,
      keyPath: authMode === "key" ? keyPath : undefined,
      passphrase: authMode === "key" ? passphrase || undefined : undefined,
    });
  };

  return (
    <form className="conn-form" onSubmit={submit}>
      <h2>Koneksi SSH baru</h2>

      <div className="row">
        <label>
          Host
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.10" autoFocus />
        </label>
        <label className="port">
          Port
          <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
        </label>
      </div>

      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ubuntu" />
      </label>

      <div className="auth-tabs">
        <button type="button" className={authMode === "password" ? "active" : ""} onClick={() => setAuthMode("password")}>
          Password
        </button>
        <button type="button" className={authMode === "key" ? "active" : ""} onClick={() => setAuthMode("key")}>
          Private key
        </button>
      </div>

      {authMode === "password" ? (
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      ) : (
        <>
          <label>
            Path private key
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={keyPath}
                onChange={(e) => setKeyPath(e.target.value)}
                placeholder="/home/diki/.ssh/id_ed25519"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleBrowseKey}
                title="Cari file Private Key"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--accent)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                <FolderOpen size={14} /> Browse...
              </button>
            </div>
          </label>
          <label>
            Passphrase (opsional)
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </label>
        </>
      )}

      <button type="submit" className="connect-btn">Connect</button>
    </form>
  );
}
