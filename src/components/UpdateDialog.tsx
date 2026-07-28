import { useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Sparkles, Download, CheckCircle2, AlertCircle, X, RefreshCw } from "lucide-react";
import { useTranslation } from "../lib/i18n";

interface UpdateDialogProps {
  update: Update | null;
  onClose: () => void;
}

export function UpdateDialog({ update, onClose }: UpdateDialogProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [status, setStatus] = useState<"idle" | "downloading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!update) return null;

  const handleInstallUpdate = async () => {
    try {
      setDownloading(true);
      setStatus("downloading");
      setErrorMsg("");

      let downloaded = 0;

      await update.downloadAndInstall((event: any) => {
        if (event.event === "Started") {
          setTotalBytes(event.data.contentLength || 0);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setDownloadedBytes(downloaded);
        } else if (event.event === "Finished") {
          setStatus("ready");
        }
      });

      setStatus("ready");
      // Memicu restart aplikasi otomatis setelah update selesai dipasang
      try {
        await relaunch();
      } catch {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Update failed:", err);
      setStatus("error");
      setErrorMsg(err?.message || String(err));
      setDownloading(false);
    }
  };

  const progressPercent = totalBytes > 0 ? Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100) : 0;

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-card">
        <div className="update-modal-header">
          <div className="update-modal-icon">
            <Sparkles size={24} className="sparkles-icon" />
          </div>
          <button className="update-modal-close" onClick={onClose} disabled={downloading}>
            <X size={16} />
          </button>
        </div>

        <div className="update-modal-body">
          <h3 className="update-modal-title">{t.updateTitle}</h3>
          <p className="update-modal-version">
            Terminalku <span className="version-badge">v{update.version}</span>
          </p>

          <p className="update-modal-desc">{t.updateDesc}</p>

          {update.body && (
            <div className="update-release-notes">
              <h4>Release Notes:</h4>
              <pre>{update.body}</pre>
            </div>
          )}

          {status === "downloading" && (
            <div className="update-progress-section">
              <div className="update-progress-label">
                <span>{t.updateDownloading}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="update-progress-bar-bg">
                <div className="update-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="update-status-msg success">
              <CheckCircle2 size={16} />
              <span>{t.updateReady}</span>
            </div>
          )}

          {status === "error" && (
            <div className="update-status-msg error">
              <AlertCircle size={16} />
              <span>{t.updateError}: {errorMsg}</span>
            </div>
          )}
        </div>

        <div className="update-modal-footer">
          <button
            className="update-btn-secondary"
            onClick={onClose}
            disabled={downloading}
          >
            {t.updateBtnLater}
          </button>

          <button
            className="update-btn-primary"
            onClick={handleInstallUpdate}
            disabled={downloading || status === "ready"}
          >
            {downloading ? (
              <>
                <RefreshCw size={14} className="spin-icon" /> {t.updateDownloading}
              </>
            ) : status === "ready" ? (
              <>
                <CheckCircle2 size={14} /> {t.updateReady}
              </>
            ) : (
              <>
                <Download size={14} /> {t.updateBtnNow}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Function helper untuk mengecek update secara manual atau silent */
export async function checkForAppUpdates(): Promise<Update | null> {
  try {
    const update = await check();
    if (update?.available) {
      return update;
    }
    return null;
  } catch (err) {
    console.warn("Check update warning:", err);
    return null;
  }
}
