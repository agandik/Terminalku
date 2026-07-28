import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { listSerialPorts, detectSerialBaudRate, fixSerialPermissions, checkDialoutPermission, type SerialPortDetail } from "../lib/ipc";

interface SerialFormProps {
  onConnect: (
    portName: string,
    baudRate: number,
    dataBits: number,
    parity: string,
    stopBits: number,
    enableLogging?: boolean
  ) => void;
  onCancel?: () => void;
}

export function SerialForm({ onConnect, onCancel }: SerialFormProps) {
  const [ports, setPorts] = useState<SerialPortDetail[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [baudRate, setBaudRate] = useState(9600);
  const [dataBits, setDataBits] = useState(8);
  const [parity, setParity] = useState("none");
  const [stopBits, setStopBits] = useState(1);
  const [enableLogging] = useState(false);
  if (onCancel) {
    // optional cancel handler
  }
  const [loading, setLoading] = useState(false);
  const [detectingBaud, setDetectingBaud] = useState(false);
  const [fixingPerm, setFixingPerm] = useState(false);
  const [dialoutFixed, setDialoutFixed] = useState(false);

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const isFixed = await checkDialoutPermission();
      setDialoutFixed(isFixed);

      const detected = await listSerialPorts();
      setPorts(detected);
      if (detected.length > 0) {
        const targetPort = detected[0].port_name;
        setSelectedPort(targetPort);

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
        setSelectedPort("");
      }
    } catch (err) {
      console.error("Gagal mendeteksi port serial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPort) {
      alert("Harap pilih port serial terlebih dahulu!");
      return;
    }
    onConnect(selectedPort, baudRate, dataBits, parity, stopBits, enableLogging);
  };

  return (
    <form className="conn-form" onSubmit={handleSubmit}>
      <h2>Koneksi Serial baru</h2>

      <div className="row">
        <label style={{ flex: 1 }}>
          Port Serial
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg-input)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "8px",
                color: "var(--text)",
              }}
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
              disabled={loading}
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
              <RefreshCw size={14} className={loading ? "spin" : ""} />
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
              <option value={110}>110</option>
              <option value={300}>300</option>
              <option value={600}>600</option>
              <option value={1200}>1200</option>
              <option value={2400}>2400</option>
              <option value={4800}>4800</option>
              <option value={9600}>9600</option>
              <option value={14400}>14400</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
              <option value={230400}>230400</option>
            </select>
            <button
              type="button"
              onClick={async () => {
                if (!selectedPort) {
                  alert("Harap pilih port serial terlebih dahulu!");
                  return;
                }
                setDetectingBaud(true);
                try {
                  const detected = await detectSerialBaudRate(selectedPort);
                  setBaudRate(detected);
                } catch (err) {
                  alert("Gagal mendeteksi baud rate: " + err);
                } finally {
                  setDetectingBaud(false);
                }
              }}
              disabled={detectingBaud || !selectedPort}
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

      <button type="submit" className="connect-btn" disabled={!selectedPort}>
        Connect
      </button>
    </form>
  );
}
