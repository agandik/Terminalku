import { useState, useEffect, useRef } from "react";
import { Terminal, type TerminalHandle } from "./components/Terminal";
import { TabBar } from "./components/TabBar";
import { NewSessionDialog } from "./components/NewSessionDialog";
import { Sidebar } from "./components/Sidebar";
import { ProfileForm } from "./components/ProfileForm";
import { FtpBrowser } from "./components/FtpBrowser";
import { SettingsDialog, type AppSettings } from "./components/SettingsDialog";
import { UpdateDialog, checkForAppUpdates } from "./components/UpdateDialog";
import type { Update } from "@tauri-apps/plugin-updater";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TitleBar } from "./components/TitleBar";
import { SearchPanel } from "./components/SearchPanel";
import SnippetPanel from "./components/SnippetPanel";
import { CommandPalette } from "./components/CommandPalette";
import {
  CommandPanel,
  type CommandEntry,
  loadCommandHistory,
  saveCommandHistory,
  recordCommand,
} from "./components/CommandPanel";
import { openSessionFromProfile, createProfile, updateProfile, openLocalTerminal } from "./lib/ipc";
import type { Tab, Profile, Protocol, DeviceVendor } from "./lib/types";
import { getCurrentWindow, PhysicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { Columns, Rows, X } from "lucide-react";
import { LanguageProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { WindowResizeHandles } from "./components/WindowResizeHandles";
import "./App.css";

type Status = "connecting" | "connected" | "error";

let globalTabCounter = 0;
export const getNextTabKey = () => ++globalTabCounter;

/** Wrapper Komponen FTP Browser agar me-render UI FTP di dalam tab */
function FtpBrowserWrapper({
  open,
  onStatus,
}: {
  open: (onOutput: (bytes: Uint8Array) => void) => Promise<number>;
  onStatus: (status: Status, detail?: string) => void;
}) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    onStatus("connecting");
    open(() => {})
      .then((id) => {
        setSessionId(id);
        onStatus("connected");
      })
      .catch((err) => {
        const msg = typeof err === "string" ? err : String(err);
        setErrorMsg(msg);
        onStatus("error", msg);
      });
  }, []);

  if (errorMsg) {
    return <div className="ftp-wrapper-error">Gagal membuka Sesi FTP: {errorMsg}</div>;
  }
  if (sessionId === null) {
    return <div className="ftp-wrapper-loading">Menghubungkan Sesi FTP...</div>;
  }

  return <FtpBrowser sessionId={sessionId} />;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState<number | null>(null);

  // Persistence: Restore Window Size, Position & Maximized State on Launch
  useEffect(() => {
    const restoreWindowState = async () => {
      try {
        const appWindow = getCurrentWindow();
        const savedState = localStorage.getItem("remote_app_window_geometry");
        if (savedState) {
          const { isMaximized, width, height, x, y } = JSON.parse(savedState);
          if (isMaximized) {
            await appWindow.maximize();
          } else {
            if (width && height) {
              await appWindow.setSize(new PhysicalSize(width, height));
            }
            if (x !== undefined && y !== undefined) {
              await appWindow.setPosition(new PhysicalPosition(x, y));
            }
          }
        }
      } catch (err) {
        console.error("Gagal memulihkan kondisi window:", err);
      }
    };
    void restoreWindowState();
  }, []);

  // Persistence: Save Window Size, Position & Maximized State on Resize / Move
  useEffect(() => {
    let timer: any = null;
    const saveWindowState = async () => {
      try {
        const appWindow = getCurrentWindow();
        const isMaximized = await appWindow.isMaximized();
        const size = await appWindow.outerSize();
        const pos = await appWindow.outerPosition();

        localStorage.setItem(
          "remote_app_window_geometry",
          JSON.stringify({
            isMaximized,
            width: size.width,
            height: size.height,
            x: pos.x,
            y: pos.y,
          })
        );
      } catch (err) {
        console.error("Gagal menyimpan posisi window:", err);
      }
    };

    try {
      const appWindow = getCurrentWindow();
      const unlistenResized = appWindow.onResized(() => {
        clearTimeout(timer);
        timer = setTimeout(saveWindowState, 300);
      });

      const unlistenMoved = appWindow.onMoved(() => {
        clearTimeout(timer);
        timer = setTimeout(saveWindowState, 300);
      });

      return () => {
        unlistenResized.then((fn) => fn());
        unlistenMoved.then((fn) => fn());
      };
    } catch (err) {
      console.error("Gagal mendaftarkan listener window:", err);
    }
  }, []);

  // States Split Workspace
  const [splitOwnerKey, setSplitOwnerKey] = useState<number | null>(null);
  const [splitKey, setSplitKey] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<"vertical" | "horizontal">("vertical");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mode Panel Kanan Terpisah: "none" | "search" | "commands" | "snippets"
  const [activeRightPanel, setActiveRightPanel] = useState<"none" | "search" | "commands" | "snippets">("none");
  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>(() => loadCommandHistory());
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [detectedVendors, setDetectedVendors] = useState<Record<number, DeviceVendor>>({});

  // Refs ke komponen Terminal per tab key
  const terminalRefs = useRef<Record<number, TerminalHandle | null>>({});

  const [showNew, setShowNew] = useState(false);
  const [newSessionProto, setNewSessionProto] = useState<Protocol>("ssh");
  const [statuses, setStatuses] = useState<Record<number, { status: Status; detail: string }>>({});

  // States Drag & Drop Split Zone
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const [draggedTabTitle, setDraggedTabTitle] = useState("");
  const [dragTargetMode, setDragTargetMode] = useState<"vertical" | "horizontal">("vertical");
  const bodyRef = useRef<HTMLDivElement>(null);

  // States untuk manajemen profil
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeEditProfile, setActiveEditProfile] = useState<Profile | undefined>(undefined);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  // States untuk manajemen pengaturan (preferences)
  const [showSettings, setShowSettings] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);

  // Background check update otomatis saat aplikasi dibuka
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForAppUpdates().then((update) => {
        if (update) setAvailableUpdate(update);
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("remote_app_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      theme: "termius",
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 5000,
      autoReconnect: false,
      enableLogging: false,
    };
  });

  // Shortcut keyboard: Ctrl+B (toggle sidebar left), Ctrl+F (open search panel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setActiveRightPanel((cur) => (cur === "search" ? "none" : "search"));
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCmdPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addTab = (tab: Tab, initialVendor?: DeviceVendor) => {
    setTabs((t) => [...t, tab]);
    setActiveKey(tab.key);
    setShowNew(false);
    if (initialVendor && initialVendor !== "auto") {
      setDetectedVendors((prev) => ({ ...prev, [tab.key]: initialVendor }));
    }
  };

  const handleConnectProfile = (profile: Profile) => {
    addTab(
      {
        key: getNextTabKey(),
        title: profile.name,
        protocol: profile.protocol,
        open: (onOutput) => openSessionFromProfile(profile.id, onOutput, profile.enable_logging || false),
      },
      profile.device_vendor
    );
  };

  const handleOpenLocalTerminal = () => {
    addTab(
      {
        key: getNextTabKey(),
        title: "Terminal Lokal",
        protocol: "local",
        open: (onOutput) => openLocalTerminal(onOutput, 80, 24),
      },
      "linux"
    );
  };

  const closeTab = (key: number) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.key !== key);
      setActiveKey((cur) =>
        cur === key ? (remaining.length ? remaining[remaining.length - 1].key : null) : cur
      );
      return remaining;
    });

    setStatuses((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (splitOwnerKey === key || splitKey === key) {
      setSplitOwnerKey(null);
      setSplitKey(null);
    }
    delete terminalRefs.current[key];
  };

  const setStatus = (key: number, status: Status, detail: string = "") => {
    setStatuses((prev) => ({ ...prev, [key]: { status, detail } }));
  };

  const handleCommandRecorded = (cmd: string) => {
    const activeVendor = activeKey !== null ? detectedVendors[activeKey] : undefined;
    const updated = recordCommand(cmd, activeVendor);
    setCommandHistory(updated);
  };

  const handleAddProfileClick = () => {
    setActiveEditProfile(undefined);
    setShowProfileForm(true);
  };

  const handleEditProfileClick = (profile: Profile) => {
    setActiveEditProfile(profile);
    setShowProfileForm(true);
  };

  const handleSaveProfile = async (p: Partial<Profile>, password?: string) => {
    if (activeEditProfile) {
      await updateProfile({ ...activeEditProfile, ...p } as Profile, password);
    } else {
      await createProfile(p as any, password);
    }
    setShowProfileForm(false);
    setActiveEditProfile(undefined);
    setSidebarRefresh((prev) => prev + 1);
  };

  const toggleSplit = () => {
    if (tabs.length < 2) return;

    if (splitOwnerKey !== null && splitKey !== null) {
      setSplitOwnerKey(null);
      setSplitKey(null);
    } else {
      const primaryKey = activeKey ?? tabs[0].key;
      const secondaryTab = tabs.find((t) => t.key !== primaryKey);
      if (secondaryTab) {
        setSplitOwnerKey(primaryKey);
        setSplitKey(secondaryTab.key);
        setActiveKey(primaryKey);
      }
    }
  };

  const handleSplitWithTab = (ownerKey: number, targetKey: number, mode: "vertical" | "horizontal") => {
    setSplitOwnerKey(ownerKey);
    setSplitKey(targetKey);
    setSplitMode(mode);
    setActiveKey(ownerKey);
  };

  const handleDragOverArea = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (bodyRef.current) {
      const rect = bodyRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const height = rect.height;

      if (relativeY > height * 0.6) {
        setDragTargetMode("horizontal");
      } else {
        setDragTargetMode("vertical");
      }
    }
  };

  const handleDropTab = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingTab(false);

    const reorderKey = e.dataTransfer.getData("remote-app/reorder-key");
    const tabKeyStr = e.dataTransfer.getData("remote-app/tab-key");

    if (reorderKey && !tabKeyStr) return;

    const sourceTabKey = Number(tabKeyStr);

    if (sourceTabKey && tabs.length >= 2) {
      const targetOwnerKey = activeKey && activeKey !== sourceTabKey ? activeKey : tabs.find((t) => t.key !== sourceTabKey)?.key;

      if (targetOwnerKey && targetOwnerKey !== sourceTabKey) {
        setSplitOwnerKey(targetOwnerKey);
        setSplitKey(sourceTabKey);
        setSplitMode(dragTargetMode);
        setActiveKey(targetOwnerKey);
      }
    }
  };

  const active = tabs.find((t) => t.key === activeKey) ?? null;
  const activeStatus = activeKey !== null ? statuses[activeKey] : null;

  const ownerTab = splitOwnerKey ? tabs.find((t) => t.key === splitOwnerKey) ?? null : null;
  const splitTab = splitKey ? tabs.find((t) => t.key === splitKey) ?? null : null;

  const isSplitWorkspaceActive =
    splitOwnerKey !== null &&
    splitKey !== null &&
    ownerTab !== null &&
    splitTab !== null &&
    (activeKey === splitOwnerKey || activeKey === splitKey);

  const statusText =
    !activeStatus ? "" :
    activeStatus.status === "connecting" ? "menghubungkan…" :
    activeStatus.status === "connected" ? "terhubung" :
    `error: ${activeStatus.detail}`;

  const renderTabContent = (t: Tab) => {
    return t.protocol === "ftp" ? (
      <FtpBrowserWrapper open={t.open} onStatus={(s, d) => setStatus(t.key, s, d)} />
    ) : (
      <Terminal
        ref={(el) => {
          terminalRefs.current[t.key] = el;
        }}
        open={t.open}
        onStatus={(s, d) => setStatus(t.key, s, d)}
        onCommand={handleCommandRecorded}
        onVendorDetected={(v) => {
          setDetectedVendors((prev) => ({ ...prev, [t.key]: v }));
        }}
        themeName={settings.theme}
        fontSize={settings.fontSize}
        fontFamily={settings.fontFamily}
        scrollback={settings.scrollback}
      />
    );
  };

  return (
    <div className="app">
      <WindowResizeHandles />
      <TitleBar
        title={active?.title}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="app-main-layout">
        <Sidebar
          onConnectProfile={handleConnectProfile}
          onAddProfile={handleAddProfileClick}
          onEditProfile={handleEditProfileClick}
          refreshTrigger={sidebarRefresh}
          collapsed={sidebarCollapsed}
        />

        <div className="app-content-area">
          <TabBar
            tabs={tabs}
            activeKey={activeKey}
            splitOwnerKey={splitOwnerKey}
            splitKey={splitKey}
            showNew={showNew}
            onSelect={(k) => {
              setActiveKey(k);
              setShowNew(false);
            }}
            onClose={closeTab}
            onNew={() => {
              setNewSessionProto("ssh");
              setShowNew(true);
            }}
            onSettings={() => setShowSettings(true)}
            onToggleSplit={toggleSplit}
            onUnsplit={() => {
              setSplitOwnerKey(null);
              setSplitKey(null);
            }}
            onSplitWithTab={handleSplitWithTab}
            onDragTabStart={(_k, title) => {
              setIsDraggingTab(true);
              setDraggedTabTitle(title);
            }}
            onDragTabEnd={() => {
              setIsDraggingTab(false);
            }}
            onReorderTabs={(newTabs) => {
              setTabs(newTabs);
            }}
            onToggleSearch={() => {
              setActiveRightPanel((cur) => (cur === "search" ? "none" : "search"));
            }}
            searchActive={activeRightPanel === "search"}
            onToggleCommands={() => {
              setActiveRightPanel((cur) => (cur === "commands" ? "none" : "commands"));
            }}
            commandsActive={activeRightPanel === "commands"}
            onToggleSnippets={() => {
              setActiveRightPanel((cur) => (cur === "snippets" ? "none" : "snippets"));
            }}
            snippetsActive={activeRightPanel === "snippets"}
          />

          {active && !showNew && (
            <div className="status-bar">
              <span className={`status status-${activeStatus?.status}`}>
                {active.title} {isSplitWorkspaceActive && splitTab ? ` ↔ [Grouped Compare dengan ${splitTab.title}]` : ""} · {statusText}
              </span>
            </div>
          )}

          <main
            ref={bodyRef}
            className="app-body"
            style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}
            onDragOver={handleDragOverArea}
            onDrop={handleDropTab}
          >
            {/* Visual Drag Pill Overlay (Gaya Termius) */}
            {isDraggingTab && (() => {
              const isHoriz = dragTargetMode === "horizontal";
              return (
                <div
                  className="drop-zone-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 200,
                    pointerEvents: "none",
                    background: "var(--overlay-drag)",
                    backdropFilter: "blur(2px)",
                    display: "flex",
                    flexDirection: isHoriz ? "column" : "row",
                    alignItems: "stretch",
                    justifyContent: "flex-end",
                  }}
                >
                  {/* Spacer 50% */}
                  <div style={{ flex: 1 }} />
                  {/* Preview Box — tepat 50% KANAN (vertical) atau 50% BAWAH (horizontal) */}
                  <div
                    className="drop-zone-box"
                    style={{
                      flex: "0 0 50%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      background: "var(--accent-soft)",
                      border: "2px dashed var(--accent)",
                      borderRadius: "var(--r-md)",
                      animation: "previewPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    {isHoriz ? <Rows size={28} /> : <Columns size={28} />}
                    <div className="drop-zone-pill">
                      <span className="pill-dot">●</span>
                      {draggedTabTitle || "Terminal Tab"}
                    </div>
                    <span className="drop-zone-hint">
                      {isHoriz
                        ? "Lepas di sini untuk Split Horizontal (Atas / Bawah)"
                        : "Lepas di sini untuk Split Vertikal (Kiri / Kanan)"}
                    </span>
                  </div>
                </div>
              );
            })()}


            {/* Split Workspace Control Bar (Jika Mode Compare Aktif) */}
            {!showNew && isSplitWorkspaceActive && ownerTab && splitTab && (
              <div className="split-workspace-bar">
                <div className="split-pane-label">
                  <span className="pane-title">{ownerTab.title}</span>
                  <span className="pane-tag">{splitMode === "vertical" ? "KIRI" : "ATAS"}</span>
                </div>
                <div className="split-pane-actions">
                  <button
                    className="pane-mode-btn"
                    onClick={() =>
                      setSplitMode((m) => (m === "vertical" ? "horizontal" : "vertical"))
                    }
                    title={
                      splitMode === "vertical"
                        ? "Ganti ke Split Horizontal (Atas-Bawah)"
                        : "Ganti ke Split Vertikal (Kiri-Kanan)"
                    }
                  >
                    {splitMode === "vertical" ? <Rows size={13} /> : <Columns size={13} />}
                  </button>
                  <button
                    className="pane-close-btn"
                    onClick={() => {
                      setSplitOwnerKey(null);
                      setSplitKey(null);
                    }}
                    title="Tutup Compare View (Unsplit)"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="split-pane-label">
                  <span className="pane-title">{splitTab.title}</span>
                  <span className="pane-tag">{splitMode === "vertical" ? "KANAN" : "BAWAH"}</span>
                </div>
              </div>
            )}

            {/* PERSISTENT TERMINAL HOSTS (Komponen Terminal TIDAK PERNAH DI-UNMOUNT) */}
            <div
              className={`term-hosts-container ${
                isSplitWorkspaceActive ? `split ${splitMode}` : ""
              }`}
              style={{
                display: !showNew && tabs.length > 0 ? (isSplitWorkspaceActive ? "flex" : "block") : "none",
              }}
            >
              {tabs.map((t) => {
                const isOwner = isSplitWorkspaceActive && t.key === splitOwnerKey;
                const isSplit = isSplitWorkspaceActive && t.key === splitKey;
                const isVisible =
                  !showNew &&
                  (isSplitWorkspaceActive
                    ? isOwner || isSplit
                    : t.key === activeKey);

                let hostClass = "term-host";
                if (isSplitWorkspaceActive) {
                  if (isOwner) hostClass += " split-primary";
                  if (isSplit) hostClass += " split-secondary";
                }

                return (
                  <div
                    key={t.key}
                    className={hostClass}
                    style={{ display: isVisible ? "block" : "none" }}
                  >
                    {renderTabContent(t)}
                  </div>
                );
              })}
            </div>

            {tabs.length === 0 && !showNew && (
              <WelcomeScreen
                onNewSession={(proto) => {
                  setNewSessionProto(proto || "ssh");
                  setShowNew(true);
                }}
                onAddProfile={handleAddProfileClick}
                onOpenLocalTerminal={handleOpenLocalTerminal}
              />
            )}

            {showNew && (
              <NewSessionDialog
                initialProtocol={newSessionProto}
                onCreate={addTab}
                onCancel={() => {
                  setShowNew(false);
                }}
              />
            )}
          </main>
        </div>

        {/* ── Panel Kanan Terpisah: Search ── */}
        {activeRightPanel === "search" && (
          <SearchPanel
            onClose={() => {
              setActiveRightPanel("none");
              if (activeKey) terminalRefs.current[activeKey]?.clearSearch();
            }}
            onNext={(q) => {
              if (activeKey) terminalRefs.current[activeKey]?.findNext(q);
            }}
            onPrev={(q) => {
              if (activeKey) terminalRefs.current[activeKey]?.findPrevious(q);
            }}
            onClear={() => {
              if (activeKey) terminalRefs.current[activeKey]?.clearSearch();
            }}
          />
        )}

        {/* ── Panel Kanan Terpisah: Command Recommendations ── */}
        {activeRightPanel === "commands" && (
          <CommandPanel
            onClose={() => setActiveRightPanel("none")}
            history={commandHistory}
            activeVendor={activeKey !== null ? (detectedVendors[activeKey] || "generic") : "generic"}
            onVendorChange={(newVendor) => {
              if (activeKey !== null) {
                setDetectedVendors((prev) => ({ ...prev, [activeKey]: newVendor }));
              }
            }}
            onRedetectVendor={() => {
              if (activeKey !== null) {
                terminalRefs.current[activeKey]?.redetectVendor();
                terminalRefs.current[activeKey]?.sendInput("\r");
              }
            }}
            onSend={(cmd) => {
              if (activeKey) {
                terminalRefs.current[activeKey]?.sendInput(cmd);
                handleCommandRecorded(cmd);
              }
            }}
            onDelete={(cmd) => {
              const updated = commandHistory.filter((e) => e.command !== cmd);
              setCommandHistory(updated);
              saveCommandHistory(updated);
            }}
            onAdd={(cmd) => {
              handleCommandRecorded(cmd);
            }}
          />
        )}

        {/* ── Panel Kanan Terpisah: Snippet / Macro Library ── */}
        {activeRightPanel === "snippets" && (
          <SnippetPanel
            activeVendor={activeKey !== null ? (detectedVendors[activeKey] || undefined) : undefined}
            onSend={(cmd) => {
              if (activeKey) {
                terminalRefs.current[activeKey]?.sendInput(cmd);
                handleCommandRecorded(cmd);
              }
            }}
          />
        )}
      </div>

      {showProfileForm && (
        <ProfileForm
          profile={activeEditProfile}
          onSave={handleSaveProfile}
          onCancel={() => {
            setShowProfileForm(false);
            setActiveEditProfile(undefined);
          }}
        />
      )}

      {showSettings && (
        <SettingsDialog
          initialSettings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
          onShowUpdate={(u) => setAvailableUpdate(u)}
        />
      )}

      {availableUpdate && (
        <UpdateDialog
          update={availableUpdate}
          onClose={() => setAvailableUpdate(null)}
        />
      )}

      <CommandPalette
        isOpen={showCmdPalette}
        onClose={() => setShowCmdPalette(false)}
        onConnectProfile={handleConnectProfile}
        onSendSnippet={(code) => {
          if (activeKey !== null) {
            terminalRefs.current[activeKey]?.sendInput(code + "\r");
            handleCommandRecorded(code);
          }
        }}
        onOpenNewSession={() => setShowNew(true)}
        onOpenLocalTerminal={handleOpenLocalTerminal}
        onOpenSettings={() => setShowSettings(true)}
        onToggleSnippets={() => setActiveRightPanel((cur) => (cur === "snippets" ? "none" : "snippets"))}
        onToggleCommands={() => setActiveRightPanel((cur) => (cur === "commands" ? "none" : "commands"))}
        onToggleSearch={() => setActiveRightPanel((cur) => (cur === "search" ? "none" : "search"))}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onRefreshProfiles={() => setSidebarRefresh((r) => r + 1)}
      />
    </div>
  );
}

export default function RootApp() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  );
}
