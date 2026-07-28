import { useState, useEffect, useRef } from "react";
import {
  FolderPlus,
  Trash2,
  RefreshCw,
  ArrowUp,
  Folder,
  FileText,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Globe,
  Copy,
  Clipboard,
  Upload,
  Download,
  CornerDownRight,
} from "lucide-react";
import type { FileEntry } from "../lib/types";
import {
  listLocalDir,
  getLocalHome,
  deleteLocalFile,
  mkdirLocal,
  copyLocalFile,
  listFtpDir,
  ftpCwd,
  ftpUpload,
  ftpDownload,
  ftpDelete,
  ftpMkdir,
} from "../lib/ipc";

interface FtpBrowserProps {
  sessionId: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pane: "local" | "remote";
  item: FileEntry | null;
}

interface ClipboardState {
  item: FileEntry;
  sourcePane: "local" | "remote";
  originPath: string;
}

export function FtpBrowser({ sessionId }: FtpBrowserProps) {
  // Active Pane State for Keyboard Navigation
  const [activePane, setActivePane] = useState<"local" | "remote">("local");

  // Local Pane States & History
  const [localPath, setLocalPath] = useState("");
  const [localFiles, setLocalFiles] = useState<FileEntry[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<string[]>([]);
  const [localHistIdx, setLocalHistIdx] = useState<number>(-1);

  // Remote Pane States & History
  const [remotePath, setRemotePath] = useState("/");
  const [remoteFiles, setRemoteFiles] = useState<FileEntry[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [remoteHistory, setRemoteHistory] = useState<string[]>([]);
  const [remoteHistIdx, setRemoteHistIdx] = useState<number>(-1);

  // Drag and Drop State Ref (Reliable Drag-to-Copy)
  const draggedItemRef = useRef<{ sourcePane: "local" | "remote"; item: FileEntry } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<"local" | "remote" | null>(null);

  // Clipboard State (Copy / Paste)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    pane: "local",
    item: null,
  });

  // General States
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load Local Directory with History Tracking
  const loadLocal = async (path: string, pushHistory = true) => {
    try {
      const data = await listLocalDir(path);
      setLocalFiles(data);
      setLocalPath(path);
      setSelectedLocal(null);

      if (pushHistory) {
        setLocalHistory((prev) => {
          const nextHist = prev.slice(0, localHistIdx + 1);
          nextHist.push(path);
          setLocalHistIdx(nextHist.length - 1);
          return nextHist;
        });
      }
    } catch (err) {
      alert("Gagal membaca folder lokal: " + err);
    }
  };

  // Load Remote FTP Directory with History Tracking
  const loadRemote = async (pushHistory = true) => {
    setLoading(true);
    try {
      const pwd = await ftpCwd(sessionId, ".");
      setRemotePath(pwd);
      const data = await listFtpDir(sessionId);
      setRemoteFiles(data);
      setSelectedRemote(null);

      if (pushHistory) {
        setRemoteHistory((prev) => {
          const nextHist = prev.slice(0, remoteHistIdx + 1);
          if (nextHist[nextHist.length - 1] !== pwd) {
            nextHist.push(pwd);
            setRemoteHistIdx(nextHist.length - 1);
          }
          return nextHist;
        });
      }
    } catch (err) {
      alert("Gagal membaca folder FTP: " + err);
    } finally {
      setLoading(false);
    }
  };

  // Inisialisasi awal
  useEffect(() => {
    getLocalHome()
      .then((home) => loadLocal(home, true))
      .catch((err) => console.error(err));
    loadRemote(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Tutup Context Menu saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // --- Local Navigation History ---
  const handleLocalBack = () => {
    if (localHistIdx > 0) {
      const newIdx = localHistIdx - 1;
      const targetPath = localHistory[newIdx];
      setLocalHistIdx(newIdx);
      loadLocal(targetPath, false);
    }
  };

  const handleLocalForward = () => {
    if (localHistIdx < localHistory.length - 1) {
      const newIdx = localHistIdx + 1;
      const targetPath = localHistory[newIdx];
      setLocalHistIdx(newIdx);
      loadLocal(targetPath, false);
    }
  };

  const handleLocalDblClick = (entry: FileEntry) => {
    if (entry.is_dir) {
      const separator = localPath.includes("\\") ? "\\" : "/";
      const newPath = localPath.endsWith(separator)
        ? `${localPath}${entry.name}`
        : `${localPath}${separator}${entry.name}`;
      loadLocal(newPath, true);
    }
  };

  const handleLocalUp = () => {
    const separator = localPath.includes("\\") ? "\\" : "/";
    const parts = localPath.split(separator);
    if (parts.length > 1) {
      parts.pop();
      let parent = parts.join(separator);
      if (parent === "" && separator === "/") parent = "/";
      if (parent === "") return;
      loadLocal(parent, true);
    }
  };

  // --- Remote Navigation History ---
  const handleRemoteBack = async () => {
    if (remoteHistIdx > 0) {
      const newIdx = remoteHistIdx - 1;
      const targetPath = remoteHistory[newIdx];
      setLoading(true);
      try {
        await ftpCwd(sessionId, targetPath);
        setRemotePath(targetPath);
        const data = await listFtpDir(sessionId);
        setRemoteFiles(data);
        setSelectedRemote(null);
        setRemoteHistIdx(newIdx);
      } catch (err) {
        alert("Gagal navigasi mundur remote: " + err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoteForward = async () => {
    if (remoteHistIdx < remoteHistory.length - 1) {
      const newIdx = remoteHistIdx + 1;
      const targetPath = remoteHistory[newIdx];
      setLoading(true);
      try {
        await ftpCwd(sessionId, targetPath);
        setRemotePath(targetPath);
        const data = await listFtpDir(sessionId);
        setRemoteFiles(data);
        setSelectedRemote(null);
        setRemoteHistIdx(newIdx);
      } catch (err) {
        alert("Gagal navigasi maju remote: " + err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoteDblClick = async (entry: FileEntry) => {
    if (entry.is_dir) {
      setLoading(true);
      try {
        const newPath = await ftpCwd(sessionId, entry.name);
        setRemotePath(newPath);
        const data = await listFtpDir(sessionId);
        setRemoteFiles(data);
        setSelectedRemote(null);

        setRemoteHistory((prev) => {
          const nextHist = prev.slice(0, remoteHistIdx + 1);
          nextHist.push(newPath);
          setRemoteHistIdx(nextHist.length - 1);
          return nextHist;
        });
      } catch (err) {
        alert("Gagal berpindah folder remote: " + err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoteUp = async () => {
    setLoading(true);
    try {
      const newPath = await ftpCwd(sessionId, "..");
      setRemotePath(newPath);
      const data = await listFtpDir(sessionId);
      setRemoteFiles(data);
      setSelectedRemote(null);

      setRemoteHistory((prev) => {
        const nextHist = prev.slice(0, remoteHistIdx + 1);
        nextHist.push(newPath);
        setRemoteHistIdx(nextHist.length - 1);
        return nextHist;
      });
    } catch (err) {
      alert("Gagal ke folder remote di atasnya: " + err);
    } finally {
      setLoading(false);
    }
  };

  // --- Upload & Download Operations ---
  const handleUploadByName = async (fileName: string) => {
    setLoading(true);
    setStatusMessage(`Mengunggah ${fileName}...`);
    try {
      const separator = localPath.includes("\\") ? "\\" : "/";
      const fullLocalPath = localPath.endsWith(separator)
        ? `${localPath}${fileName}`
        : `${localPath}${separator}${fileName}`;

      await ftpUpload(sessionId, fullLocalPath, fileName);
      setStatusMessage(`Berhasil mengunggah ${fileName}!`);
      await loadRemote(false);
    } catch (err) {
      alert("Gagal mengunggah file: " + err);
      setStatusMessage("");
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(""), 2500);
    }
  };

  const handleDownloadByName = async (fileName: string) => {
    setLoading(true);
    setStatusMessage(`Mengunduh ${fileName}...`);
    try {
      const separator = localPath.includes("\\") ? "\\" : "/";
      const fullLocalPath = localPath.endsWith(separator)
        ? `${localPath}${fileName}`
        : `${localPath}${separator}${fileName}`;

      await ftpDownload(sessionId, fileName, fullLocalPath);
      setStatusMessage(`Berhasil mengunduh ${fileName}!`);
      await loadLocal(localPath, false);
    } catch (err) {
      alert("Gagal mengunduh file: " + err);
      setStatusMessage("");
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(""), 2500);
    }
  };

  // --- Folder & Delete Operations (Lokal & Remote) ---
  const handleMkdirLocal = async () => {
    const name = prompt("Masukkan nama folder lokal baru:");
    if (!name) return;

    setLoading(true);
    try {
      const separator = localPath.includes("\\") ? "\\" : "/";
      const fullPath = localPath.endsWith(separator)
        ? `${localPath}${name}`
        : `${localPath}${separator}${name}`;
      await mkdirLocal(fullPath);
      await loadLocal(localPath, false);
    } catch (err) {
      alert("Gagal membuat folder lokal: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleMkdirRemote = async () => {
    const name = prompt("Masukkan nama folder FTP baru:");
    if (!name) return;

    setLoading(true);
    try {
      await ftpMkdir(sessionId, name);
      await loadRemote(false);
    } catch (err) {
      alert("Gagal membuat folder: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocal = async (itemName?: string) => {
    const target = itemName || selectedLocal;
    if (!target) return;
    const file = localFiles.find((f) => f.name === target);
    if (!file) return;

    if (confirm(`Apakah Anda yakin ingin menghapus ${target} di komputer lokal?`)) {
      setLoading(true);
      try {
        const separator = localPath.includes("\\") ? "\\" : "/";
        const fullPath = localPath.endsWith(separator)
          ? `${localPath}${target}`
          : `${localPath}${separator}${target}`;
        await deleteLocalFile(fullPath, file.is_dir);
        await loadLocal(localPath, false);
      } catch (err) {
        alert("Gagal menghapus file/folder lokal: " + err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteRemote = async (itemName?: string) => {
    const target = itemName || selectedRemote;
    if (!target) return;
    const file = remoteFiles.find((f) => f.name === target);
    if (!file) return;

    if (confirm(`Apakah Anda yakin ingin menghapus ${target} di server remote?`)) {
      setLoading(true);
      try {
        await ftpDelete(sessionId, target, file.is_dir);
        await loadRemote(false);
      } catch (err) {
        alert("Gagal menghapus file/folder remote: " + err);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Copy / Paste Logic ---
  const handleCopy = (item: FileEntry, sourcePane: "local" | "remote") => {
    const originPath = sourcePane === "local" ? localPath : remotePath;
    setClipboard({ item, sourcePane, originPath });
    setStatusMessage(`Disalin: "${item.name}"`);
    setTimeout(() => setStatusMessage(""), 2000);
  };

  const handlePaste = async (targetPane: "local" | "remote") => {
    if (!clipboard) return;
    const { item, sourcePane, originPath } = clipboard;

    if (sourcePane === "local" && targetPane === "remote") {
      await handleUploadByName(item.name);
    } else if (sourcePane === "remote" && targetPane === "local") {
      await handleDownloadByName(item.name);
    } else if (sourcePane === "local" && targetPane === "local") {
      if (originPath === localPath) {
        setStatusMessage("Item sudah berada di folder lokal yang sama.");
        setTimeout(() => setStatusMessage(""), 2500);
        return;
      }
      setLoading(true);
      setStatusMessage(`Menyalin ${item.name} ke ${localPath}...`);
      try {
        const separator = localPath.includes("\\") ? "\\" : "/";
        const srcFullPath = originPath.endsWith(separator)
          ? `${originPath}${item.name}`
          : `${originPath}${separator}${item.name}`;
        const destFullPath = localPath.endsWith(separator)
          ? `${localPath}${item.name}`
          : `${localPath}${separator}${item.name}`;

        await copyLocalFile(srcFullPath, destFullPath);
        setStatusMessage(`Berhasil menyalin ${item.name}!`);
        await loadLocal(localPath, false);
      } catch (err) {
        alert("Gagal menyalin berkas lokal: " + err);
      } finally {
        setLoading(false);
        setTimeout(() => setStatusMessage(""), 2500);
      }
    } else if (sourcePane === "remote" && targetPane === "remote") {
      if (originPath === remotePath) {
        setStatusMessage("Item sudah berada di folder remote yang sama.");
        setTimeout(() => setStatusMessage(""), 2500);
        return;
      }
      setLoading(true);
      setStatusMessage(`Menyalin ${item.name} ke ${remotePath}...`);
      try {
        const separator = localPath.includes("\\") ? "\\" : "/";
        const tempLocalPath = localPath.endsWith(separator)
          ? `${localPath}__temp_${item.name}`
          : `${localPath}${separator}__temp_${item.name}`;

        await ftpCwd(sessionId, originPath);
        await ftpDownload(sessionId, item.name, tempLocalPath);
        await ftpCwd(sessionId, remotePath);
        await ftpUpload(sessionId, tempLocalPath, item.name);
        await deleteLocalFile(tempLocalPath, false).catch(() => {});

        setStatusMessage(`Berhasil menyalin ${item.name}!`);
        await loadRemote(false);
      } catch (err) {
        alert("Gagal menyalin berkas remote: " + err);
      } finally {
        setLoading(false);
        setTimeout(() => setStatusMessage(""), 2500);
      }
    }
  };

  // --- Keyboard Shortcuts Listener (Ctrl+C, Ctrl+V, Backspace, Delete, Enter, F5) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika fokus di elemen input teks
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Backspace -> Back Folder / Folder Induk (Ke Atas)
      if (e.key === "Backspace") {
        e.preventDefault();
        if (activePane === "local") handleLocalUp();
        else handleRemoteUp();
      }

      // Delete -> Hapus item terpilih di pane aktif
      else if (e.key === "Delete") {
        e.preventDefault();
        if (activePane === "local" && selectedLocal) {
          void handleDeleteLocal(selectedLocal);
        } else if (activePane === "remote" && selectedRemote) {
          void handleDeleteRemote(selectedRemote);
        }
      }

      // Enter -> Buka folder terpilih
      else if (e.key === "Enter") {
        e.preventDefault();
        if (activePane === "local" && selectedLocal) {
          const item = localFiles.find((f) => f.name === selectedLocal);
          if (item?.is_dir) handleLocalDblClick(item);
        } else if (activePane === "remote" && selectedRemote) {
          const item = remoteFiles.find((f) => f.name === selectedRemote);
          if (item?.is_dir) void handleRemoteDblClick(item);
        }
      }

      // Ctrl + C / Cmd + C -> Copy
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (activePane === "local" && selectedLocal) {
          const item = localFiles.find((f) => f.name === selectedLocal);
          if (item) handleCopy(item, "local");
        } else if (activePane === "remote" && selectedRemote) {
          const item = remoteFiles.find((f) => f.name === selectedRemote);
          if (item) handleCopy(item, "remote");
        }
      }

      // Ctrl + V / Cmd + V -> Paste
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void handlePaste(activePane);
      }

      // F5 atau Ctrl + R -> Refresh Active Pane
      else if (
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")
      ) {
        e.preventDefault();
        if (activePane === "local") loadLocal(localPath, false);
        else loadRemote(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activePane,
    selectedLocal,
    selectedRemote,
    localFiles,
    remoteFiles,
    clipboard,
    localPath,
    remotePath,
  ]);

  // --- Drag and Drop Handlers (Drag to Copy) ---
  const handleDragStart = (
    e: React.DragEvent,
    sourcePane: "local" | "remote",
    item: FileEntry
  ) => {
    draggedItemRef.current = { sourcePane, item };
    e.dataTransfer.setData("text/plain", item.name);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent, targetPane: "local" | "remote") => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (dragOverTarget !== targetPane) {
      setDragOverTarget(targetPane);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPane: "local" | "remote") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    const dragged = draggedItemRef.current;
    if (!dragged) return;

    if (dragged.sourcePane === "local" && targetPane === "remote") {
      await handleUploadByName(dragged.item.name);
    } else if (dragged.sourcePane === "remote" && targetPane === "local") {
      await handleDownloadByName(dragged.item.name);
    }
    draggedItemRef.current = null;
  };

  // --- Right-Click Context Menu Handlers (Dengan StopPropagation) ---
  const handleContextMenu = (
    e: React.MouseEvent,
    pane: "local" | "remote",
    item: FileEntry | null
  ) => {
    e.preventDefault();
    e.stopPropagation(); // MENCEGAH OVERWRITE OLEH PARENT PANE DIV!
    setActivePane(pane);

    if (item) {
      if (pane === "local") setSelectedLocal(item.name);
      if (pane === "remote") setSelectedRemote(item.name);
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      pane,
      item,
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="ftp-browser">
      {statusMessage && <div className="ftp-toast">{statusMessage}</div>}

      {/* Dual Panes */}
      <div className="ftp-panes">
        {/* Pane Kiri - File Lokal Komputer */}
        <div
          className={`ftp-pane ${activePane === "local" ? "active-pane" : ""} ${
            dragOverTarget === "local" ? "drag-over-active" : ""
          }`}
          onClick={() => setActivePane("local")}
          onDragOver={(e) => handleDragOver(e, "local")}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "local")}
          onContextMenu={(e) => handleContextMenu(e, "local", null)}
        >
          <div className="pane-header">
            <h4>
              <HardDrive size={14} /> Komputer Lokal
              {activePane === "local" && <span className="active-badge">AKTIF</span>}
            </h4>
            <div className="pane-nav-buttons">
              <button className="nav-btn" onClick={handleLocalBack} disabled={localHistIdx <= 0} title="Mundur">
                <ChevronLeft size={14} />
              </button>
              <button className="nav-btn" onClick={handleLocalForward} disabled={localHistIdx >= localHistory.length - 1} title="Maju">
                <ChevronRight size={14} />
              </button>
              <button className="nav-btn" onClick={handleLocalUp} title="Folder Induk / Ke Atas (Backspace)">
                <ArrowUp size={14} />
              </button>
              <button className="nav-btn" onClick={handleMkdirLocal} title="Buat Folder Lokal Baru">
                <FolderPlus size={13} />
              </button>
              <button className="nav-btn" onClick={() => loadLocal(localPath, false)} title="Refresh Folder Lokal (F5)">
                <RefreshCw size={13} className={loading ? "spin" : ""} />
              </button>
            </div>
            <div className="pane-path" title={localPath}>{localPath}</div>
          </div>

          <div className="pane-list">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="col-size">Ukuran</th>
                </tr>
              </thead>
              <tbody>
                {localFiles.map((f) => (
                  <tr
                    key={f.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "local", f)}
                    className={`file-row ${selectedLocal === f.name ? "selected" : ""} ${
                      f.is_dir ? "is-dir" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePane("local");
                      setSelectedLocal(f.name);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleLocalDblClick(f);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, "local", f)}
                  >
                    <td>
                      <span className="file-icon">{f.is_dir ? <Folder size={14} /> : <FileText size={14} />}</span> {f.name}
                    </td>
                    <td className="col-size">{f.is_dir ? "<DIR>" : formatSize(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pane Kanan - File Remote FTP Server */}
        <div
          className={`ftp-pane ${activePane === "remote" ? "active-pane" : ""} ${
            dragOverTarget === "remote" ? "drag-over-active" : ""
          }`}
          onClick={() => setActivePane("remote")}
          onDragOver={(e) => handleDragOver(e, "remote")}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "remote")}
          onContextMenu={(e) => handleContextMenu(e, "remote", null)}
        >
          <div className="pane-header">
            <h4>
              <Globe size={14} /> Server FTP (Remote)
              {activePane === "remote" && <span className="active-badge">AKTIF</span>}
            </h4>
            <div className="pane-nav-buttons">
              <button className="nav-btn" onClick={handleRemoteBack} disabled={remoteHistIdx <= 0} title="Mundur">
                <ChevronLeft size={14} />
              </button>
              <button className="nav-btn" onClick={handleRemoteForward} disabled={remoteHistIdx >= remoteHistory.length - 1} title="Maju">
                <ChevronRight size={14} />
              </button>
              <button className="nav-btn" onClick={handleRemoteUp} title="Folder Induk / Ke Atas (Backspace)">
                <ArrowUp size={14} />
              </button>
              <button className="nav-btn" onClick={handleMkdirRemote} title="Buat Folder Remote Baru">
                <FolderPlus size={13} />
              </button>
              <button className="nav-btn" onClick={() => loadRemote(false)} title="Refresh Folder Remote (F5)">
                <RefreshCw size={13} className={loading ? "spin" : ""} />
              </button>
            </div>
            <div className="pane-path" title={remotePath}>{remotePath}</div>
          </div>

          <div className="pane-list">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="col-size">Ukuran</th>
                </tr>
              </thead>
              <tbody>
                {remoteFiles.map((f) => (
                  <tr
                    key={f.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "remote", f)}
                    className={`file-row ${selectedRemote === f.name ? "selected" : ""} ${
                      f.is_dir ? "is-dir" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePane("remote");
                      setSelectedRemote(f.name);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      void handleRemoteDblClick(f);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, "remote", f)}
                  >
                    <td>
                      <span className="file-icon">{f.is_dir ? <Folder size={14} /> : <FileText size={14} />}</span> {f.name}
                    </td>
                    <td className="col-size">{f.is_dir ? "<DIR>" : formatSize(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Popover Menu Konteks Klik-Kanan Advanced */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="ftp-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.pane === "local" ? (
            <>
              {contextMenu.item && (
                <>
                  <button
                    onClick={() => {
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                      if (contextMenu.item) void handleUploadByName(contextMenu.item.name);
                    }}
                  >
                    <Upload size={13} /> Unggah Direct ke Remote
                  </button>

                  <button
                    onClick={() => {
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                      if (contextMenu.item) handleCopy(contextMenu.item, "local");
                    }}
                  >
                    <Copy size={13} /> Salin (Copy) <span className="shortcut-hint">Ctrl+C</span>
                  </button>
                </>
              )}

              <button
                disabled={!clipboard}
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  void handlePaste("local");
                }}
              >
                <Clipboard size={13} /> Tempel (Paste) <span className="shortcut-hint">Ctrl+V</span>
              </button>

              {contextMenu.item?.is_dir && (
                <button
                  onClick={() => {
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    if (contextMenu.item) handleLocalDblClick(contextMenu.item);
                  }}
                >
                  <CornerDownRight size={13} /> Masuk Folder <span className="shortcut-hint">Enter</span>
                </button>
              )}

              <button
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  void handleMkdirLocal();
                }}
              >
                <FolderPlus size={13} /> Buat Folder Baru
              </button>

              {contextMenu.item && (
                <button
                  className="danger"
                  onClick={() => {
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    if (contextMenu.item) void handleDeleteLocal(contextMenu.item.name);
                  }}
                >
                  <Trash2 size={13} /> Hapus (Delete) <span className="shortcut-hint">Delete</span>
                </button>
              )}

              <div className="menu-divider" />
              <button
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  loadLocal(localPath, false);
                }}
              >
                <RefreshCw size={13} /> Refresh Lokal <span className="shortcut-hint">F5</span>
              </button>
            </>
          ) : (
            <>
              {contextMenu.item && (
                <>
                  <button
                    onClick={() => {
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                      if (contextMenu.item) void handleDownloadByName(contextMenu.item.name);
                    }}
                  >
                    <Download size={13} /> Unduh Direct ke Lokal
                  </button>

                  <button
                    onClick={() => {
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                      if (contextMenu.item) handleCopy(contextMenu.item, "remote");
                    }}
                  >
                    <Copy size={13} /> Salin (Copy) <span className="shortcut-hint">Ctrl+C</span>
                  </button>
                </>
              )}

              <button
                disabled={!clipboard}
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  void handlePaste("remote");
                }}
              >
                <Clipboard size={13} /> Tempel (Paste) <span className="shortcut-hint">Ctrl+V</span>
              </button>

              {contextMenu.item?.is_dir && (
                <button
                  onClick={() => {
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    if (contextMenu.item) void handleRemoteDblClick(contextMenu.item);
                  }}
                >
                  <CornerDownRight size={13} /> Masuk Folder Remote <span className="shortcut-hint">Enter</span>
                </button>
              )}

              <button
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  void handleMkdirRemote();
                }}
              >
                <FolderPlus size={13} /> Buat Folder Baru
              </button>

              {contextMenu.item && (
                <button
                  className="danger"
                  onClick={() => {
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    if (contextMenu.item) void handleDeleteRemote(contextMenu.item.name);
                  }}
                >
                  <Trash2 size={13} /> Hapus (Delete) <span className="shortcut-hint">Delete</span>
                </button>
              )}

              <div className="menu-divider" />
              <button
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  void loadRemote(false);
                }}
              >
                <RefreshCw size={13} /> Refresh Remote <span className="shortcut-hint">F5</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
