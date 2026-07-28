import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X, PanelLeft, PanelLeftClose, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "../lib/theme";
import { useTranslation } from "../lib/i18n";
import { TerminalkuLogo } from "./TerminalkuLogo";

interface TitleBarProps {
  title?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function TitleBar({ title, sidebarCollapsed, onToggleSidebar }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const { resolved, toggle } = useTheme();
  const { t } = useTranslation();

  const checkMaximized = async () => {
    try {
      const max = await invoke<boolean>("window_is_maximized");
      setIsMaximized(max);
    } catch {
      try {
        setIsMaximized(await getCurrentWindow().isMaximized());
      } catch {}
    }
  };

  useEffect(() => {
    checkMaximized();
    try {
      const appWindow = getCurrentWindow();
      const unlistenPromise = appWindow.onResized(() => {
        checkMaximized();
      });

      return () => {
        unlistenPromise.then((unlisten) => unlisten());
      };
    } catch {}
  }, []);

  const handleMinimize = async () => {
    try {
      await invoke("window_minimize");
    } catch {
      try {
        await getCurrentWindow().minimize();
      } catch (err) {
        console.warn("Minimize failed:", err);
      }
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await invoke("window_toggle_maximize");
      await checkMaximized();
    } catch {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
        await checkMaximized();
      } catch (err) {
        console.warn("Maximize failed:", err);
      }
    }
  };

  const handleClose = async () => {
    try {
      await invoke("window_close");
    } catch {
      try {
        await getCurrentWindow().close();
      } catch (err) {
        console.warn("Close failed:", err);
      }
    }
  };

  return (
    <div className="custom-titlebar" data-tauri-drag-region onDoubleClick={handleToggleMaximize}>
      <div className="titlebar-brand" data-tauri-drag-region onDoubleClick={handleToggleMaximize}>
        {onToggleSidebar && (
          <button
            className="titlebar-sidebar-toggle"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? "Buka Sidebar (Ctrl+B)" : "Tutup Sidebar (Ctrl+B)"}
          >
            {sidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
        <div className="titlebar-icon">
          {/* Tanpa tile: di 18px, glyph di dalam tile cuma ~8px dan tidak terbaca. */}
          <TerminalkuLogo size={18} showTile={false} />
        </div>
        <span className="titlebar-title" data-tauri-drag-region>
          {title ? `Terminalku — ${title}` : "Terminalku"}
        </span>
      </div>

      <div className="titlebar-controls">
        <button
          className="titlebar-btn titlebar-theme-btn"
          onClick={toggle}
          title={resolved === "dark" ? t.switchToLight : t.switchToDark}
          aria-label={resolved === "dark" ? t.switchToLight : t.switchToDark}
        >
          {resolved === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <span className="titlebar-divider" />
        <button className="titlebar-btn" onClick={handleMinimize} title="Kecilkan (Minimize)">
          <Minus size={13} />
        </button>
        <button
          className="titlebar-btn"
          onClick={handleToggleMaximize}
          title={isMaximized ? "Pulihkan (Restore)" : "Maksimalkan (Maximize)"}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button className="titlebar-btn close-btn" onClick={handleClose} title="Tutup (Close)">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
