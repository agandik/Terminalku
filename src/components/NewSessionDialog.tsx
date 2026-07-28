import { useState } from "react";
import { Terminal, Radio, Cpu, Server, X, Monitor } from "lucide-react";
import { ConnectionForm } from "./ConnectionForm";
import { SerialForm } from "./SerialForm";
import { openSsh, openTelnet, openSerial, openFtp, openLocalTerminal, type SshConfig } from "../lib/ipc";
import type { Protocol, Tab } from "../lib/types";
import { getNextTabKey } from "../App";

export function NewSessionDialog({
  onCreate,
  onCancel,
  initialProtocol = "ssh",
}: {
  onCreate: (tab: Tab) => void;
  onCancel: () => void;
  initialProtocol?: Protocol;
}) {
  const [protocol, setProtocol] = useState<Protocol>(initialProtocol);

  const getLoggingSetting = (): boolean => {
    const saved = localStorage.getItem("remote_app_settings");
    if (saved) {
      try {
        return JSON.parse(saved).enableLogging || false;
      } catch {
        return false;
      }
    }
    return false;
  };

  const createSsh = (cfg: SshConfig) => {
    const logging = getLoggingSetting();
    onCreate({
      key: getNextTabKey(),
      title: `${cfg.username}@${cfg.host}`,
      protocol: "ssh",
      open: (onOutput) => openSsh(cfg, onOutput, logging),
    });
  };

  const createSerial = (
    portName: string,
    baudRate: number,
    dataBits: number,
    parity: string,
    stopBits: number,
  ) => {
    const logging = getLoggingSetting();
    onCreate({
      key: getNextTabKey(),
      title: `Serial: ${portName.split("/").pop()}`,
      protocol: "serial",
      // D-28: bila port terkunci (PORT_BUSY), minta konfirmasi user dulu sebelum
      // force-release (fuser -k -9) — karena bisa menghentikan proses lain.
      open: async (onOutput) => {
        try {
          return await openSerial(portName, baudRate, dataBits, parity, stopBits, onOutput, logging, false);
        } catch (err) {
          const msg = String(err);
          if (msg.includes("PORT_BUSY")) {
            const ok = window.confirm(
              `Port ${portName} sedang dikunci oleh proses lain.\n\n` +
                `Force-release akan MENGHENTIKAN PAKSA proses tersebut (fuser -k -9). ` +
                `Lanjutkan?`,
            );
            if (!ok) throw new Error("Koneksi dibatalkan: port serial sedang dipakai proses lain.");
            return await openSerial(portName, baudRate, dataBits, parity, stopBits, onOutput, logging, true);
          }
          throw err;
        }
      },
    });
  };

  const createFtp = (
    host: string,
    port: number,
    username: string,
    password?: string,
    ftps?: boolean,
    allowInsecure?: boolean,
  ) => {
    onCreate({
      key: getNextTabKey(),
      title: `FTP: ${host}`,
      protocol: "ftp",
      open: () => openFtp(host, port, username, password, ftps, allowInsecure),
    });
  };

  /** Buka terminal lokal langsung — tidak perlu form tambahan. */
  const createLocalTerminal = () => {
    onCreate({
      key: getNextTabKey(),
      title: "Terminal Lokal",
      protocol: "local",
      open: (onOutput) => openLocalTerminal(onOutput, 80, 24),
    });
  };

  return (
    <div className="new-session">
      <div className="proto-tabs">
        <button className={protocol === "ssh" ? "active" : ""} onClick={() => setProtocol("ssh")}>
          <Terminal size={14} /> SSH
        </button>
        <button className={protocol === "telnet" ? "active" : ""} onClick={() => setProtocol("telnet")}>
          <Radio size={14} /> Telnet
        </button>
        <button className={protocol === "serial" ? "active" : ""} onClick={() => setProtocol("serial")}>
          <Cpu size={14} /> Serial
        </button>
        <button className={protocol === "ftp" ? "active" : ""} onClick={() => setProtocol("ftp")}>
          <Server size={14} /> FTP
        </button>
        <button className={protocol === "local" ? "active" : ""} onClick={() => setProtocol("local")}>
          <Monitor size={14} /> Lokal
        </button>
        <button className="cancel" onClick={onCancel} title="Batal">
          <X size={14} />
        </button>
      </div>

      {protocol === "ssh" && <ConnectionForm onConnect={createSsh} />}

      {protocol === "telnet" && (
        <TelnetForm
          onConnect={(host, port, username, password) => {
            const logging = getLoggingSetting();
            onCreate({
              key: getNextTabKey(),
              title: `${host}:${port}`,
              protocol: "telnet",
              open: (onOutput) => openTelnet(host, port, onOutput, logging, username, password),
            });
          }}
        />
      )}

      {protocol === "serial" && <SerialForm onConnect={createSerial} />}

      {protocol === "ftp" && <FtpForm onConnect={createFtp} />}

      {protocol === "local" && <LocalTerminalPanel onOpen={createLocalTerminal} />}
    </div>
  );
}

function TelnetForm({
  onConnect,
}: {
  onConnect: (host: string, port: number, username?: string, password?: string) => void;
}) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(23);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) return;
    onConnect(host, port, username || undefined, password || undefined);
  };

  return (
    <form className="conn-form" onSubmit={submit}>
      <h2>Koneksi Telnet baru</h2>
      <div className="row">
        <label>
          Host
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.1"
            autoFocus
          />
        </label>
        <label className="port">
          Port
          <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
        </label>
      </div>
      <div className="row">
        <label>
          Username (Auto Login)
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
        </label>
        <label>
          Password (Auto Login)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>
      <button type="submit" className="connect-btn">
        Connect
      </button>
    </form>
  );
}

function FtpForm({
  onConnect,
}: {
  onConnect: (host: string, port: number, username: string, password?: string, ftps?: boolean, allowInsecure?: boolean) => void;
}) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(21);
  const [username, setUsername] = useState("anonymous");
  const [password, setPassword] = useState("");
  const [ftps, setFtps] = useState(false);
  const [allowInsecure, setAllowInsecure] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !username) return;
    onConnect(host, port, username, password, ftps, allowInsecure);
  };

  return (
    <form className="conn-form" onSubmit={submit}>
      <h2>Koneksi FTP baru</h2>
      <div className="row">
        <label>
          Host
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="ftp.example.com"
            autoFocus
          />
        </label>
        <label className="port">
          Port
          <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
        </label>
      </div>
      <div className="row">
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      </div>
      <div className="row checkbox-row">
        <label className="checkbox-label">
          <input type="checkbox" checked={ftps} onChange={(e) => setFtps(e.target.checked)} />
          <span>Gunakan FTPS (FTP over TLS)</span>
        </label>
      </div>
      {ftps && (
        <div className="row checkbox-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={allowInsecure}
              onChange={(e) => setAllowInsecure(e.target.checked)}
            />
            <span>⚠️ Terima sertifikat tidak tepercaya (rentan MITM — hanya untuk server lab)</span>
          </label>
        </div>
      )}
      <button type="submit" className="connect-btn">
        Connect
      </button>
    </form>
  );
}

/** Panel info terminal lokal — satu klik langsung terbuka, tidak butuh form. */
function LocalTerminalPanel({ onOpen }: { onOpen: () => void }) {
  const shell = "bash"; // ditentukan backend via $SHELL env

  return (
    <div className="conn-form local-terminal-panel">
      <h2>Terminal Lokal</h2>
      <p className="local-desc">
        Buka shell sistem (<code>{shell}</code>) langsung di dalam tab baru.
        Semua program interaktif (vim, htop, nano, dll.) dapat berjalan penuh.
      </p>
      <div className="local-info-grid">
        <div className="local-info-item">
          <span className="local-info-label">Shell</span>
          <span className="local-info-value">$SHELL (atau /bin/bash)</span>
        </div>
        <div className="local-info-item">
          <span className="local-info-label">Emulasi</span>
          <span className="local-info-value">xterm-256color</span>
        </div>
        <div className="local-info-item">
          <span className="local-info-label">Color</span>
          <span className="local-info-value">Truecolor (24-bit)</span>
        </div>
      </div>
      <button className="connect-btn" onClick={onOpen} autoFocus>
        <Monitor size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Buka Terminal Lokal
      </button>
    </div>
  );
}
