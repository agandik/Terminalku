import { useState, useEffect } from "react";
import { RefreshCw, ArrowLeft, FolderOpen } from "lucide-react";
import type { Profile, Protocol, DeviceVendor } from "../lib/types";
import { listSerialPorts, listProfiles, detectSerialBaudRate, fixSerialPermissions, checkDialoutPermission, type SerialPortDetail } from "../lib/ipc";

interface ProfileFormProps {
  profile?: Profile;
  onSave: (profile: Profile, password?: string) => void;
  onCancel: () => void;
}

export function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || "");
  const [groupPath, setGroupPath] = useState(profile?.group_path || "");
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [isNewGroupMode, setIsNewGroupMode] = useState(false);

  const [protocol, setProtocol] = useState<Protocol>(profile?.protocol || "ssh");
  const [host, setHost] = useState(profile?.host || "");
  const [port, setPort] = useState(profile?.port || 22);
  const [username, setUsername] = useState(profile?.username || "");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [keyPath, setKeyPath] = useState("");
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");

  // Serial fields
  const [ports, setPorts] = useState<SerialPortDetail[]>([]);
  const [serialPort, setSerialPort] = useState(profile?.serial_port || "");
  const [baudRate, setBaudRate] = useState(9600);
  const [dataBits, setDataBits] = useState(8);
  const [parity, setParity] = useState("none");
  const [stopBits, setStopBits] = useState(1);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [detectingBaud, setDetectingBaud] = useState(false);
  const [fixingPerm, setFixingPerm] = useState(false);
  const [dialoutFixed, setDialoutFixed] = useState(false);

  // FTP fields
  const [ftps, setFtps] = useState(false);
  const [ftpsInsecure, setFtpsInsecure] = useState(false);
  const [enableLogging, setEnableLogging] = useState(false);

  // Vendor field
  const [deviceVendor, setDeviceVendor] = useState<DeviceVendor>("auto");

  // Ambil grup yang sudah ada dari database SQLite
  useEffect(() => {
    listProfiles()
      .then((profs) => {
        const groups = Array.from(
          new Set(profs.map((p) => p.group_path.trim()).filter((g) => g.length > 0))
        );
        setExistingGroups(groups);
        if (profile?.group_path && !groups.includes(profile.group_path.trim())) {
          setIsNewGroupMode(true);
        }
      })
      .catch(console.error);
  }, [profile]);

  const fetchPorts = async () => {
    setLoadingPorts(true);
    try {
      const isFixed = await checkDialoutPermission();
      setDialoutFixed(isFixed);

      const detected = await listSerialPorts();
      setPorts(detected);
      if (detected.length > 0) {
        const targetPort = serialPort && detected.some((p) => p.port_name === serialPort)
          ? serialPort
          : detected[0].port_name;
        setSerialPort(targetPort);

        // Auto-detect Baud Rate 1x secara otomatis tanpa perlu diklik
        setDetectingBaud(true);
        try {
          const rate = await detectSerialBaudRate(targetPort);
          if (rate) {
            setBaudRate(rate);
          }
        } catch (err) {
          console.error("Auto detect baud rate error:", err);
        } finally {
          setDetectingBaud(false);
        }
      } else {
        setSerialPort("");
      }
    } catch (err) {
      console.error("Gagal mendeteksi port serial:", err);
    } finally {
      setLoadingPorts(false);
    }
  };

  useEffect(() => {
    if (protocol === "serial") {
      fetchPorts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setGroupPath(profile.group_path);
      setProtocol(profile.protocol);
      setHost(profile.host);
      setPort(profile.port);
      setUsername(profile.username);
      setAuthMethod(profile.auth_method);
      setKeyPath(profile.key_path);
      setPassword(""); // Password tidak dimuat demi keamanan
      setPassphrase("");

      // Serial fields
      setSerialPort(profile.serial_port || "");
      setBaudRate(profile.baud_rate || 9600);
      setDataBits(profile.data_bits || 8);
      setParity(profile.parity || "none");
      setStopBits(profile.stop_bits || 1);

      // FTP fields
      setFtps(profile.ftps || false);
      setFtpsInsecure(profile.ftps_insecure || false);

      // Vendor
      setDeviceVendor(profile.device_vendor || "auto");
      // Logging
      setEnableLogging(profile.enable_logging || false);
    } else {
      setName("");
      setGroupPath("");
      setProtocol("ssh");
      setHost("");
      setPort(22);
      setUsername("");
      setAuthMethod("password");
      setKeyPath("");
      setPassword("");
      setPassphrase("");

      // Serial default
      setSerialPort("");
      setBaudRate(9600);
      setDataBits(8);
      setParity("none");
      setStopBits(1);

      // FTP default
      setFtps(false);

      // Vendor default
      setDeviceVendor("auto");
    }
  }, [profile]);

  const handleProtocolChange = (proto: Protocol) => {
    setProtocol(proto);
    if (proto === "ssh") {
      setPort(22);
    } else if (proto === "telnet") {
      setPort(23);
    } else if (proto === "ftp") {
      setPort(21);
      if (!username) setUsername("anonymous");
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (protocol !== "serial" && !host) return;
    if ((protocol === "ssh" || protocol === "ftp") && !username) return;
    if (protocol === "serial" && !serialPort) {
      alert("Harap pilih port serial terlebih dahulu!");
      return;
    }

    const id = profile?.id || crypto.randomUUID();
    const now = Date.now();

    let hasPassword = false;
    let pwdToSave: string | undefined = undefined;

    if (protocol === "ssh") {
      if (authMethod === "password") {
        if (password) {
          hasPassword = true;
          pwdToSave = password;
        } else if (profile && profile.protocol === "ssh" && profile.auth_method === "password" && profile.has_password) {
          hasPassword = true;
          pwdToSave = undefined; // keep existing
        } else {
          hasPassword = false;
          pwdToSave = ""; // delete existing
        }
      } else { // key auth
        if (passphrase) {
          hasPassword = true;
          pwdToSave = passphrase;
        } else if (profile && profile.protocol === "ssh" && profile.auth_method === "key" && profile.has_password) {
          hasPassword = true;
          pwdToSave = undefined; // keep existing
        } else {
          hasPassword = false;
          pwdToSave = ""; // delete existing
        }
      }
    } else if (protocol === "ftp" || protocol === "telnet") {
      if (password) {
        hasPassword = true;
        pwdToSave = password;
      } else if (profile && (profile.protocol === "ftp" || profile.protocol === "telnet") && profile.has_password) {
        hasPassword = true;
        pwdToSave = undefined; // keep existing
      } else {
        hasPassword = false;
        pwdToSave = ""; // delete existing
      }
    } else {
      hasPassword = false;
      pwdToSave = ""; // delete existing
    }

    const updatedProfile: Profile = {
      id,
      name,
      group_path: groupPath.trim(),
      protocol,
      host: protocol === "serial" ? "" : host,
      port: protocol === "serial" ? 0 : port,
      username: protocol === "ssh" || protocol === "ftp" || protocol === "telnet" ? username : "",
      auth_method: protocol === "ssh" ? authMethod : "password",
      key_path: protocol === "ssh" && authMethod === "key" ? keyPath : "",
      has_password: hasPassword,
      // Serial
      serial_port: protocol === "serial" ? serialPort : "",
      baud_rate: protocol === "serial" ? baudRate : 9600,
      data_bits: protocol === "serial" ? dataBits : 8,
      parity: protocol === "serial" ? parity : "none",
      stop_bits: protocol === "serial" ? stopBits : 1,
      // FTP
      ftps: protocol === "ftp" ? ftps : false,
      ftps_insecure: protocol === "ftp" ? ftps && ftpsInsecure : false,
      // Vendor
      device_vendor: deviceVendor,
      // Misc
      legacy_mode: profile?.legacy_mode || false,
      enable_logging: enableLogging,
      created_at: profile?.created_at || now,
      updated_at: now,
    };

    onSave(updatedProfile, pwdToSave);
  };

  return (
    <div className="profile-form-overlay">
      <form className="conn-form profile-form" onSubmit={handleSubmit}>
        <h2>{profile ? "Edit Profil Koneksi" : "Profil Koneksi Baru"}</h2>

        <div className="form-grid">
          <label>
            Nama Profil *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: Router Core 7606 / Server Web"
              required
            />
          </label>

          <label>
            Grup / Folder
            {!isNewGroupMode ? (
              <select
                value={groupPath}
                onChange={(e) => {
                  if (e.target.value === "__NEW_GROUP__") {
                    setIsNewGroupMode(true);
                    setGroupPath("");
                  } else {
                    setGroupPath(e.target.value);
                  }
                }}
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "4px",
                  padding: "8px",
                  color: "var(--text)",
                }}
              >
                <option value="">(Tanpa Grup / Root)</option>
                {existingGroups.map((g) => (
                  <option key={g} value={g}>
                    📁 {g}
                  </option>
                ))}
                <option value="__NEW_GROUP__">+ Buat Grup / Folder Baru...</option>
              </select>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <input
                  value={groupPath}
                  onChange={(e) => setGroupPath(e.target.value)}
                  placeholder="Ketik nama grup baru (misal: IDC)"
                  autoFocus={isNewGroupMode}
                />
                {existingGroups.length > 0 && isNewGroupMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewGroupMode(false);
                      setGroupPath(existingGroups[0] || "");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--accent)",
                      fontSize: "11px",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowLeft size={12} /> Pilih dari grup yang sudah ada
                  </button>
                )}
              </div>
            )}
          </label>

          <label>
            Tipe Perangkat / OS (Vendor)
            <select
              value={deviceVendor}
              onChange={(e) => setDeviceVendor(e.target.value as DeviceVendor)}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "8px",
                color: "var(--text)",
              }}
            >
              <option value="auto">🤖 Auto-Detect (Deteksi dari Banner Terminal)</option>
              <option value="cisco_ios_router">🔵 Cisco Router (IOS / IOS-XE)</option>
              <option value="cisco_ios_switch">⚡ Cisco Switch (Catalyst / IOS)</option>
              <option value="cisco_nxos">🔷 Cisco NX-OS (Data Center Switch)</option>
              <option value="mikrotik">🟢 MikroTik RouterOS</option>
              <option value="huawei_vrp">🔴 Huawei VRP</option>
              <option value="juniper_junos">🟣 Juniper JunOS</option>
              <option value="linux">🐧 Linux / Ubuntu / Debian</option>
              <option value="generic">⚡ Generic Terminal</option>
            </select>
          </label>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={protocol === "ssh" ? "active" : ""}
            onClick={() => handleProtocolChange("ssh")}
          >
            SSH
          </button>
          <button
            type="button"
            className={protocol === "telnet" ? "active" : ""}
            onClick={() => handleProtocolChange("telnet")}
          >
            Telnet
          </button>
          <button
            type="button"
            className={protocol === "serial" ? "active" : ""}
            onClick={() => handleProtocolChange("serial")}
          >
            Serial
          </button>
          <button
            type="button"
            className={protocol === "ftp" ? "active" : ""}
            onClick={() => handleProtocolChange("ftp")}
          >
            FTP
          </button>
        </div>

        {protocol === "serial" ? (
          <>
            <div className="row">
              <label style={{ flex: 1 }}>
                Port Serial
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={serialPort}
                    onChange={(e) => setSerialPort(e.target.value)}
                    style={{
                      flex: 1,
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "4px",
                      padding: "8px",
                      color: "var(--text)",
                    }}
                    required
                  >
                    {ports.map((p) => (
                      <option key={p.port_name} value={p.port_name}>
                        {p.port_name} {p.description ? `(${p.description})` : ""}
                      </option>
                    ))}
                    {ports.length === 0 && <option value="">Tidak ada port terdeteksi</option>}
                  </select>
                  <button
                    type="button"
                    onClick={fetchPorts}
                    disabled={loadingPorts}
                    title="Refresh Port Serial"
                    style={{
                      padding: "8px 12px",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-strong)",
                      color: "var(--text)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <RefreshCw size={14} className={loadingPorts ? "spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setFixingPerm(true);
                      try {
                        await fixSerialPermissions();
                        alert("Berhasil memperbarui izin serial! Memuat ulang port...");
                        await fetchPorts();
                      } catch (err) {
                        alert("Gagal memperbarui izin: " + err);
                      } finally {
                        setFixingPerm(false);
                      }
                    }}
                    disabled={fixingPerm}
                    title={
                      dialoutFixed
                        ? "Izin Dialout Sudah Aktif & Fix. Klik jika ingin memicu ulang perbaikan izin"
                        : "Klik 1-Click untuk memperbarui izin dialout & udev rules"
                    }
                    style={{
                      padding: "8px 12px",
                      background: dialoutFixed
                        ? "var(--ok-soft)"
                        : "var(--err-soft)",
                      border: dialoutFixed
                        ? "1px solid var(--ok-ring)"
                        : "1px solid var(--err-ring)",
                      color: dialoutFixed
                        ? "var(--ok)"
                        : "var(--err)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fixingPerm
                      ? "⏳ Fixing..."
                      : dialoutFixed
                      ? "✓ Izin Dialout Fix"
                      : "🔧 Fix Izin Dialout"}
                  </button>
                </div>
              </label>
            </div>

            <div className="row">
              <label style={{ flex: 1 }}>
                Baud Rate
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    style={{
                      flex: 1,
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "4px",
                      padding: "8px",
                      color: "var(--text)",
                    }}
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={57600}>57600</option>
                    <option value={115200}>115200</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!serialPort) {
                        alert("Pilih port serial terlebih dahulu!");
                        return;
                      }
                      setDetectingBaud(true);
                      try {
                        const detected = await detectSerialBaudRate(serialPort);
                        setBaudRate(detected);
                      } catch (err) {
                        alert("Gagal mendeteksi baud rate: " + err);
                      } finally {
                        setDetectingBaud(false);
                      }
                    }}
                    disabled={detectingBaud || !serialPort}
                    title="Auto-Detect Baud Rate"
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
                    }}
                  >
                    <RefreshCw size={13} className={detectingBaud ? "spin" : ""} />
                    {detectingBaud ? "Scanning..." : "⚡ Auto"}
                  </button>
                </div>
              </label>

              <label className="port">
                Data Bits
                <select
                  value={dataBits}
                  onChange={(e) => setDataBits(Number(e.target.value))}
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "4px",
                    padding: "8px",
                    color: "var(--text)",
                  }}
                >
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </label>
            </div>

            <div className="row">
              <label>
                Parity
                <select
                  value={parity}
                  onChange={(e) => setParity(e.target.value)}
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "4px",
                    padding: "8px",
                    color: "var(--text)",
                  }}
                >
                  <option value="none">None</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </label>

              <label className="port">
                Stop Bits
                <select
                  value={stopBits}
                  onChange={(e) => setStopBits(Number(e.target.value))}
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "4px",
                    padding: "8px",
                    color: "var(--text)",
                  }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <label>
                Host
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.5"
                  required
                />
              </label>
              <label className="port">
                Port
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  required
                />
              </label>
            </div>

            {protocol === "ssh" && (
              <>
                <label>
                  Username
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ubuntu"
                    required
                  />
                </label>

                <div className="auth-tabs sub-tabs">
                  <button
                    type="button"
                    className={authMethod === "password" ? "active" : ""}
                    onClick={() => setAuthMethod("password")}
                  >
                    Password Auth
                  </button>
                  <button
                    type="button"
                    className={authMethod === "key" ? "active" : ""}
                    onClick={() => setAuthMethod("key")}
                  >
                    Private Key Auth
                  </button>
                </div>

                {authMethod === "password" ? (
                  <label>
                    Password {profile?.has_password && "(Biarkan kosong jika tidak ingin mengubah)"}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={profile?.has_password ? "••••••••" : ""}
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Path Private Key
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          value={keyPath}
                          onChange={(e) => setKeyPath(e.target.value)}
                          placeholder="/home/username/.ssh/id_ed25519"
                          required
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
                      Passphrase Key {profile?.has_password && "(Biarkan kosong jika tidak ingin mengubah)"}
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={profile?.has_password ? "••••••••" : ""}
                      />
                    </label>
                  </>
                )}
              </>
            )}

            {protocol === "telnet" && (
              <div className="row" style={{ marginTop: "12px" }}>
                <label>
                  Username (Auto Login)
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                  />
                </label>
                <label>
                  Password (Auto Login) {profile?.has_password && "(Biarkan kosong jika tidak ingin mengubah)"}
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={profile?.has_password ? "••••••••" : ""}
                  />
                </label>
              </div>
            )}

            {protocol === "ftp" && (
              <>
                <div className="row">
                  <label>
                    Username
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="anonymous"
                      required
                    />
                  </label>
                  <label>
                    Password {profile?.has_password && "(Biarkan kosong jika tidak ingin mengubah)"}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={profile?.has_password ? "••••••••" : ""}
                    />
                  </label>
                </div>
                <div className="row checkbox-row" style={{ marginTop: "12px" }}>
                  <label className="checkbox-label" style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={ftps} onChange={(e) => setFtps(e.target.checked)} />
                    <span>Gunakan FTPS (FTP over TLS)</span>
                  </label>
                </div>
                {ftps && (
                  <div className="row checkbox-row" style={{ marginTop: "8px" }}>
                    <label className="checkbox-label" style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" checked={ftpsInsecure} onChange={(e) => setFtpsInsecure(e.target.checked)} />
                      <span>⚠️ Terima sertifikat tidak tepercaya (rentan MITM — hanya untuk server lab)</span>
                    </label>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ─── Rekam Sesi (Fase 15) ─── */}
        <div className="row checkbox-row" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <label className="checkbox-label" style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={enableLogging} onChange={(e) => setEnableLogging(e.target.checked)} />
            <span>💾 Rekam sesi ke log otomatis (<code style={{fontSize:"0.78em", opacity:0.7}}>app_data/logs/</code>)</span>
          </label>
        </div>

        <div className="form-actions row">
          <button type="submit" className="connect-btn">
            Simpan
          </button>
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
