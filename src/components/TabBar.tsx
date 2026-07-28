// Bilah tab multi-session (FR-6).
// Fitur: Drag-to-reorder, scroll horizontal via wheel,
// Compare Mode Popover Picker (Option A), drag-to-split, tombol "+" untuk sesi baru.

import { useRef, useState, useEffect } from "react";
import { Plus, X, Settings, Columns, Rows, Unlink, Search, Zap, Code2 } from "lucide-react";
import type { Protocol, Tab } from "../lib/types";
import { useTranslation } from "../lib/i18n";

const badge: Record<Protocol, string> = {
  ssh: "SSH",
  telnet: "TEL",
  serial: "SER",
  ftp: "FTP",
  local: "LOC",
};

export function TabBar({
  tabs,
  activeKey,
  splitOwnerKey,
  splitKey,
  showNew,
  onSelect,
  onClose,
  onNew,
  onSettings,
  onUnsplit,
  onSplitWithTab,
  onDragTabStart,
  onDragTabEnd,
  onReorderTabs,
  onToggleSearch,
  searchActive,
  onToggleCommands,
  commandsActive,
  onToggleSnippets,
  snippetsActive,
}: {
  tabs: Tab[];
  activeKey: number | null;
  splitOwnerKey?: number | null;
  splitKey?: number | null;
  showNew?: boolean;
  onSelect: (key: number) => void;
  onClose: (key: number) => void;
  onNew: () => void;
  onSettings?: () => void;
  onToggleSplit?: () => void;
  onUnsplit?: () => void;
  onSplitWithTab?: (ownerKey: number, targetKey: number, mode: "vertical" | "horizontal") => void;
  onDragTabStart?: (key: number, title: string) => void;
  onDragTabEnd?: () => void;
  /** Callback saat urutan tab berubah akibat drag-to-reorder */
  onReorderTabs?: (newTabs: Tab[]) => void;
  onToggleSearch?: () => void;
  searchActive?: boolean;
  onToggleCommands?: () => void;
  commandsActive?: boolean;
  onToggleSnippets?: () => void;
  snippetsActive?: boolean;
  /** Keys tab yang sedang merekam log (badge REC) */
  loggingTabKeys?: Set<number>;
}) {
  const splitTab = splitKey ? tabs.find((t) => t.key === splitKey) ?? null : null;
  const activeTab = activeKey ? tabs.find((t) => t.key === activeKey) ?? null : null;
  const isSplitActive = splitOwnerKey !== null && splitKey !== null && splitTab !== null;

  // ── Popover Dropdown Split Screen State ─────────────────────────────────────
  const { t } = useTranslation();
  const [showSplitPopover, setShowSplitPopover] = useState(false);
  const [splitLayoutMode, setSplitLayoutMode] = useState<"vertical" | "horizontal">("vertical");

  // ── Drag-to-Reorder State ──────────────────────────────────────────────────
  const [dragReorderKey, setDragReorderKey] = useState<number | null>(null);
  const [dragOverKey, setDragOverKey] = useState<number | null>(null);

  // Ref scroll container untuk wheel handler
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll horizontal via mouse wheel (scroll bawah → kanan, atas → kiri)
  // Memblokir scroll vertikal 100% agar highlight bawah tab tidak pernah terpotong/hilang
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      el.scrollTop = 0;
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, []);

  return (
    <div className="tabbar">
      <div
        ref={scrollRef}
        className="tabbar-scroll"
      >
        {tabs.map((t) => {
          // Mode Compare / Split View: Jika ini adalah tab owner (utama) dan sedang split dengan tab lain
          if (isSplitActive && t.key === splitOwnerKey && splitTab) {
            const isGroupedActive = activeKey === splitOwnerKey || activeKey === splitKey;
            return (
              <div
                key={t.key}
                className={`tab grouped-tab ${isGroupedActive ? "active" : ""}`}
                onClick={() => onSelect(t.key)}
              >
                <span className={`tab-badge badge-${t.protocol}`}>{badge[t.protocol]}</span>
                <span className="tab-title" title={t.title}>{t.title}</span>
                <span className="grouped-separator">|</span>
                <span className={`tab-badge badge-${splitTab.protocol}`}>{badge[splitTab.protocol]}</span>
                <span className="tab-title" title={splitTab.title}>{splitTab.title}</span>

                {/* Tombol Pisahkan (Unsplit) */}
                {onUnsplit && (
                  <button
                    type="button"
                    className="unsplit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnsplit();
                    }}
                    title="Pisahkan Sesi Compare (Kembalikan ke Tab Terpisah)"
                  >
                    <Unlink size={13} />
                  </button>
                )}

                <span
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(t.key);
                  }}
                  title="Tutup Sesi Ini"
                >
                  <X size={13} />
                </span>
              </div>
            );
          }

          // Jika tab ini adalah tab sekunder yang sedang digabung ke splitView, Sembunyikan dari bar
          if (isSplitActive && t.key === splitKey) {
            return null;
          }

          const isActive = t.key === activeKey && !showNew;
          const isReordering = dragReorderKey === t.key;
          const isOver = dragOverKey === t.key;

          return (
            <div
              key={t.key}
              draggable
              className={`tab ${isActive ? "active" : ""} ${isReordering ? "dragging" : ""} ${isOver ? "drag-over" : ""}`}
              onClick={() => onSelect(t.key)}
              onDragStart={(e) => {
                setDragReorderKey(t.key);
                e.dataTransfer.setData("remote-app/reorder-key", String(t.key));
                e.dataTransfer.setData("remote-app/tab-key", String(t.key));
                e.dataTransfer.setData("text/plain", t.title);
                e.dataTransfer.effectAllowed = "move";
                onDragTabStart?.(t.key, t.title);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragReorderKey !== null && dragReorderKey !== t.key) {
                  setDragOverKey(t.key);
                }
              }}
              onDragLeave={() => {
                if (dragOverKey === t.key) {
                  setDragOverKey(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                const reorderSourceKeyStr = e.dataTransfer.getData("remote-app/reorder-key");
                if (reorderSourceKeyStr && onReorderTabs) {
                  const sourceKey = Number(reorderSourceKeyStr);
                  if (sourceKey !== t.key) {
                    const srcIdx = tabs.findIndex((item) => item.key === sourceKey);
                    const targetIdx = tabs.findIndex((item) => item.key === t.key);
                    if (srcIdx !== -1 && targetIdx !== -1) {
                      const updated = [...tabs];
                      const [moved] = updated.splice(srcIdx, 1);
                      updated.splice(targetIdx, 0, moved);
                      onReorderTabs(updated);
                    }
                  }
                }
              }}
              onDragEnd={() => {
                setDragReorderKey(null);
                setDragOverKey(null);
                onDragTabEnd?.();
              }}
            >
              <span className={`tab-badge badge-${t.protocol}`}>{badge[t.protocol]}</span>
              <span className="tab-title" title={t.title}>
                {t.title}
              </span>

              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.key);
                }}
              >
                <X size={13} />
              </span>
            </div>
          );
        })}

        {/* Tombol tambah tab baru */}
        <button
          className={`tab-new ${showNew ? "active" : ""}`}
          onClick={onNew}
          title="Sesi baru"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* ── Action buttons kanan ── */}
      <div className="tabbar-actions">
        {onToggleSearch && (
          <button
            className={`icon-btn ${searchActive ? "active-split-btn" : ""}`}
            onClick={onToggleSearch}
            title={searchActive ? t.hideSearchTooltip : t.searchTooltip}
          >
            <Search size={16} />
          </button>
        )}
        {onToggleCommands && (
          <button
            className={`icon-btn ${commandsActive ? "active-split-btn" : ""}`}
            onClick={onToggleCommands}
            title={commandsActive ? t.hideCommandRecTooltip : t.commandRecTooltip}
          >
            <Zap size={16} />
          </button>
        )}
        {onToggleSnippets && (
          <button
            className={`icon-btn ${snippetsActive ? "active-split-btn" : ""}`}
            onClick={onToggleSnippets}
            title={snippetsActive ? t.hideSnippetLibTooltip : t.snippetLibTooltip}
          >
            <Code2 size={16} />
          </button>
        )}
        {tabs.length > 1 && (
          <button
            className={`icon-btn ${isSplitActive || showSplitPopover ? "active-split-btn" : ""}`}
            onClick={() => setShowSplitPopover((v) => !v)}
            title={t.compareModeTooltip}
          >
            <Columns size={16} />
          </button>
        )}
        {onSettings && (
          <button className="icon-btn" onClick={onSettings} title={t.settingsTitle}>
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* ── Popover Dropdown Picker (Option A) ── */}
      {showSplitPopover && (
        <div
          className="split-popover-backdrop"
          onClick={() => setShowSplitPopover(false)}
        >
          <div
            className="split-popover-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popover */}
            <div className="split-popover-header">
              <div className="split-popover-title">
                <Columns size={16} />
                <span>{t.comparePopoverTitle}</span>
              </div>
              <button
                type="button"
                className="split-popover-close"
                onClick={() => setShowSplitPopover(false)}
              >
                <X size={14} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="split-mode-selector">
              <span className="split-mode-label">{t.layoutModeLabel}</span>
              <div className="split-mode-buttons">
                <button
                  type="button"
                  className={`split-mode-btn ${splitLayoutMode === "vertical" ? "active" : ""}`}
                  onClick={() => setSplitLayoutMode("vertical")}
                >
                  <Columns size={13} /> {t.layoutVertical}
                </button>
                <button
                  type="button"
                  className={`split-mode-btn ${splitLayoutMode === "horizontal" ? "active" : ""}`}
                  onClick={() => setSplitLayoutMode("horizontal")}
                >
                  <Rows size={13} /> {t.layoutHorizontal}
                </button>
              </div>
            </div>

            {/* Tab Select List */}
            <div className="split-tab-select-section">
              <span className="split-select-hint">
                {t.compareSelectHint}{" "}
                <strong>"{activeTab?.title || "Sesi"}"</strong>:
              </span>
              <div className="split-tab-list">
                {tabs
                  .filter((item) => item.key !== activeKey)
                  .map((item) => {
                    const isCurrentlySplit = isSplitActive && item.key === splitKey;
                    return (
                      <div
                        key={item.key}
                        className={`split-tab-item ${isCurrentlySplit ? "currently-split" : ""}`}
                        onClick={() => {
                          if (onSplitWithTab && activeKey !== null) {
                            onSplitWithTab(activeKey, item.key, splitLayoutMode);
                            setShowSplitPopover(false);
                          }
                        }}
                      >
                        <span className={`tab-badge badge-${item.protocol}`}>
                          {badge[item.protocol]}
                        </span>
                        <span className="split-tab-item-title">{item.title}</span>
                        {isCurrentlySplit ? (
                          <span className="split-active-pill">{t.currentlySplit}</span>
                        ) : (
                          <span className="split-action-btn">
                            {t.pairSession}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Unsplit Button Footer (If Split is Active) */}
            {isSplitActive && onUnsplit && (
              <div className="split-popover-footer">
                <button
                  type="button"
                  className="split-unsplit-action-btn"
                  onClick={() => {
                    onUnsplit();
                    setShowSplitPopover(false);
                  }}
                >
                  <Unlink size={14} /> Pisahkan Tampilan (Kembalikan Tab Normal)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
