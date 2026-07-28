// Wrapper xterm.js generik. Menerima fungsi `open` yang memulai sesi apa pun
// (loopback/SSH/…) dan mengembalikan session_id. Byte dari backend ditulis
// mentah ke layar; keystroke & resize dikirim balik lewat ipc.

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

import { sessionWrite, sessionResize, sessionClose } from "../lib/ipc";
import type { SessionId, DeviceVendor } from "../lib/types";
import { detectVendorFromOutput } from "../lib/deviceDetection";

const textDecoder = new TextDecoder("utf-8", { fatal: false });

/** Function to highlight network CLI output (IP addresses, interfaces, subnet masks, keywords) */
export function highlightNetworkCli(text: string): string {
  let processed = text;

  // 1. Highlight Subnet Masks (e.g. 255.255.255.192, 255.255.254.0) -> Soft Violet (#bb9af7)
  processed = processed.replace(/\b(255\.(?:[0-9]{1,3}\.){2}[0-9]{1,3})\b/g, "\x1b[38;2;187;154;247m$1\x1b[0m");

  // 2. Highlight IPv4 Addresses (e.g. 122.102.52.1, 43.252.146.231, 10.18.10.1) -> Termius Vibrant Pink (#ff527b)
  processed = processed.replace(/\b((?!(?:255\.))[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\b/g, "\x1b[38;2;255;82;123;1m$1\x1b[0m");

  // 3. Highlight Interfaces (e.g. interface Vlan521, TenGigabitEthernet5/3) -> Termius Emerald Green (#00e676)
  processed = processed.replace(/\b((?:interface\s+)?(?:TenGigabitEthernet|GigabitEthernet|FastEthernet|Ethernet|Vlan|Loopback|Serial|Port-channel|eth|wlan|ge|xe|et)[0-9\/.:]*)\b/gi, "\x1b[38;2;0;230;118;1m$1\x1b[0m");

  // 4. Highlight Keywords (description, switchport, standby, shutdown) -> Soft Cyan (#7dcfff)
  processed = processed.replace(/\b(description|switchport|standby|shutdown|no\s+shutdown|ip\s+address|no\s+ip\s+address|ip\s+access-group|storm-control|no\s+proxy-arp|no\s+cdp\s+enable)\b/gi, "\x1b[38;2;125;207;255m$1\x1b[0m");

  return processed;
}

const themes: Record<string, any> = {
  termius: {
    background: "#0d111a",
    foreground: "#cdd6f4",
    cursor: "#00e676",
    cursorAccent: "#0d111a",
    selectionBackground: "rgba(0, 230, 118, 0.25)",
    black: "#151823",
    red: "#ff527b",
    green: "#00e676",
    yellow: "#ffd740",
    blue: "#40c4ff",
    magenta: "#ff4081",
    cyan: "#18ffff",
    white: "#e0e0e0",
    brightBlack: "#546e7a",
    brightRed: "#ff8a80",
    brightGreen: "#b9f6ca",
    brightYellow: "#ffe57f",
    brightBlue: "#80d8ff",
    brightMagenta: "#ff80ab",
    brightCyan: "#a7ffeb",
    brightWhite: "#ffffff",
  },
  tokyonight: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    cursor: "#c0caf5",
    cursorAccent: "#1a1b26",
    selectionBackground: "#33467c",
    black: "#15161e",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#bb9af7",
    cyan: "#7dcfff",
    white: "#a9b1d6",
    brightBlack: "#414868",
    brightRed: "#f7768e",
    brightGreen: "#9ece6a",
    brightYellow: "#e0af68",
    brightBlue: "#7aa2f7",
    brightMagenta: "#bb9af7",
    brightCyan: "#7dcfff",
    brightWhite: "#c0caf5",
  },
  catppuccin: {
    background: "#24273a",
    foreground: "#cad3f5",
    cursor: "#f4dbd6",
    cursorAccent: "#24273a",
    selectionBackground: "#5b6078",
    black: "#494d64",
    red: "#ed8796",
    green: "#a6da95",
    yellow: "#eed49f",
    blue: "#8aadf4",
    magenta: "#f5bde6",
    cyan: "#8bd5ca",
    white: "#b8c0e0",
    brightBlack: "#5b6078",
    brightRed: "#ed8796",
    brightGreen: "#a6da95",
    brightYellow: "#eed49f",
    brightBlue: "#8aadf4",
    brightMagenta: "#f5bde6",
    brightCyan: "#8bd5ca",
    brightWhite: "#cad3f5",
  },
  onedark: {
    background: "#282c34",
    foreground: "#abb2bf",
    cursor: "#528bff",
    cursorAccent: "#282c34",
    selectionBackground: "#3e4451",
    black: "#282c34",
    red: "#e06c75",
    green: "#98c379",
    yellow: "#d19a66",
    blue: "#61afef",
    magenta: "#c678dd",
    cyan: "#56b6c2",
    white: "#abb2bf",
    brightBlack: "#5c6370",
    brightRed: "#e06c75",
    brightGreen: "#98c379",
    brightYellow: "#d19a66",
    brightBlue: "#61afef",
    brightMagenta: "#c678dd",
    brightCyan: "#56b6c2",
    brightWhite: "#ffffff",
  },
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#f8f8f2",
    cursorAccent: "#282a36",
    selectionBackground: "#44475a",
    black: "#21222c",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2",
    brightBlack: "#6272a4",
    brightRed: "#ff6e6e",
    brightGreen: "#69ff94",
    brightYellow: "#ffffa5",
    brightBlue: "#d6acff",
    brightMagenta: "#ff92d0",
    brightCyan: "#a4ffff",
    brightWhite: "#ffffff",
  },
  monokai: {
    background: "#2d2a2e",
    foreground: "#fcfcfa",
    cursor: "#fcfcfa",
    cursorAccent: "#2d2a2e",
    selectionBackground: "#403e41",
    black: "#2d2a2e",
    red: "#ff6188",
    green: "#a9dc76",
    yellow: "#ffd866",
    blue: "#fc9867",
    magenta: "#ab9df2",
    cyan: "#78dce8",
    white: "#fcfcfa",
    brightBlack: "#727072",
    brightRed: "#ff6188",
    brightGreen: "#a9dc76",
    brightYellow: "#ffd866",
    brightBlue: "#fc9867",
    brightMagenta: "#ab9df2",
    brightCyan: "#78dce8",
    brightWhite: "#ffffff",
  },
  solarized: {
    background: "#002b36",
    foreground: "#839496",
    cursor: "#839496",
    cursorAccent: "#002b36",
    selectionBackground: "#073642",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
    brightBlack: "#002b36",
    brightRed: "#cb4b16",
    brightGreen: "#586e75",
    brightYellow: "#657b83",
    brightBlue: "#839496",
    brightMagenta: "#6c71c4",
    brightCyan: "#93a1a1",
    brightWhite: "#fdf6e3",
  },
  dark: {
    background: "#0f172a",
    foreground: "#f8fafc",
    cursor: "#38bdf8",
    cursorAccent: "#0f172a",
    selectionBackground: "#1e293b",
  },
  light: {
    background: "#ffffff",
    foreground: "#0f172a",
    cursor: "#0284c7",
    cursorAccent: "#ffffff",
    selectionBackground: "#e2e8f0",
  },
};

export interface TerminalHandle {
  findNext: (query: string) => boolean;
  findPrevious: (query: string) => boolean;
  clearSearch: () => void;
  focus: () => void;
  sendInput: (text: string) => void;
  redetectVendor: () => void;
}

export interface TerminalProps {
  /** Mulai sesi; terima callback output byte, kembalikan session_id. */
  open: (onOutput: (bytes: Uint8Array) => void) => Promise<SessionId>;
  /** Dipanggil saat status berubah (untuk ditampilkan di UI). */
  onStatus?: (status: "connecting" | "connected" | "error", detail?: string) => void;
  /** Callback saat pengguna selesai mengetik command (menekan Enter). */
  onCommand?: (command: string) => void;
  /** Callback saat vendor/OS perangkat berhasil dideteksi otomatis. */
  onVendorDetected?: (vendor: DeviceVendor) => void;
  // Preferensi yang diperbarui secara dinamis
  themeName?: string;
  fontSize?: number;
  fontFamily?: string;
  scrollback?: number;
}

const encoder = new TextEncoder();

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { open, onStatus, onCommand, onVendorDetected, themeName = "termius", fontSize = 14, fontFamily = "monospace", scrollback = 5000 },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const lineBufferRef = useRef<string>("");
  const detectedRef = useRef<boolean>(false);
  const accumulatedTextRef = useRef<string>("");
  const sessionIdRef = useRef<SessionId | null>(null);

  useImperativeHandle(ref, () => ({
    findNext: (query: string) => {
      if (!searchRef.current || !query) return false;
      return searchRef.current.findNext(query, { caseSensitive: false, incremental: true });
    },
    findPrevious: (query: string) => {
      if (!searchRef.current || !query) return false;
      return searchRef.current.findPrevious(query, { caseSensitive: false });
    },
    clearSearch: () => {
      searchRef.current?.clearDecorations();
    },
    focus: () => {
      termRef.current?.focus();
    },
    sendInput: (text: string) => {
      if (sessionIdRef.current !== null) {
        // Send command text + Carriage Return directly to session backend for instant execution
        void sessionWrite(sessionIdRef.current, encoder.encode(text + "\r"));
      } else if (termRef.current) {
        termRef.current.paste(text + "\r");
      }
      if (termRef.current) {
        termRef.current.focus();
      }
    },
    redetectVendor: () => {
      detectedRef.current = false;
      accumulatedTextRef.current = "";
    },
  }));

  // Efek untuk menangani pembaruan opsi terminal secara dinamis
  useEffect(() => {
    const term = termRef.current;
    if (term) {
      term.options.fontSize = fontSize;
      term.options.fontFamily = fontFamily;
      term.options.scrollback = scrollback;
      term.options.theme = themes[themeName] || themes.termius;
      try {
        fitRef.current?.fit();
      } catch (err) {
        // Abaikan jika kontainer tersembunyi
      }
    }
  }, [themeName, fontSize, fontFamily, scrollback]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Memuat preferensi awal
    const saved = localStorage.getItem("remote_app_settings");
    let settings = {
      theme: themeName,
      fontSize: fontSize,
      fontFamily: fontFamily,
      scrollback: scrollback,
      autoReconnect: false,
    };
    if (saved) {
      try {
        settings = { ...settings, ...JSON.parse(saved) };
      } catch (err) {
        console.error("Gagal memuat pengaturan terminal:", err);
      }
    }

    const term = new XTerm({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      scrollback: settings.scrollback,
      cursorBlink: true,
      convertEol: false,
      theme: themes[settings.theme] || themes.termius,
    });
    termRef.current = term;

    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());

    const search = new SearchAddon();
    searchRef.current = search;
    term.loadAddon(search);

    term.open(containerRef.current);
    fit.fit();

    let sessionId: SessionId | null = null;
    let disposed = false;
    let reconnectTimeout: any = null;

    const connect = async () => {
      onStatus?.("connecting");
      try {
        const id = await open((bytes) => {
          const rawText = textDecoder.decode(bytes);
          const highlighted = highlightNetworkCli(rawText);
          term.write(highlighted);

          // Pasif Auto-detection Perangkat dari Akumulasi Output (Maks 4KB)
          if (!detectedRef.current && onVendorDetected) {
            if (accumulatedTextRef.current.length < 4096) {
              accumulatedTextRef.current += rawText;
            }
            const detected = detectVendorFromOutput(accumulatedTextRef.current);
            if (detected) {
              detectedRef.current = true;
              onVendorDetected(detected);
            }
          }
        });
        if (disposed) {
          void sessionClose(id);
          return;
        }
        sessionId = id;
        sessionIdRef.current = id;
        onStatus?.("connected");
        void sessionResize(id, term.cols, term.rows);
      } catch (e) {
        const msg = typeof e === "string" ? e : String(e);
        term.write(`\r\n\x1b[31m[gagal] ${msg}\x1b[0m\r\n`);
        onStatus?.("error", msg);
      }
    };

    // Mulai koneksi awal
    void connect();

    const dataSub = term.onData((data) => {
      if (sessionId !== null) void sessionWrite(sessionId, encoder.encode(data));

      // Lacak baris perintah untuk direkam saat menekan Enter
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (char === "\r" || char === "\n") {
          const cmd = lineBufferRef.current.trim();
          if (cmd.length >= 2) {
            onCommand?.(cmd);
          }
          lineBufferRef.current = "";
        } else if (char === "\x7f" || char === "\b") {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1);
        } else if (char >= " " || char === "\t") {
          lineBufferRef.current += char;
        }
      }
    });

    const resize = () => {
      const el = containerRef.current;
      if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
      fit.fit();
      if (sessionId !== null) void sessionResize(sessionId, term.cols, term.rows);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);

    // Mendengarkan event penutupan sesi dari backend
    const unlistenPromise = listen<number>("session-terminated", (event) => {
      if (event.payload === sessionId && !disposed) {
        term.write("\r\n\x1b[33m[koneksi terputus]\x1b[0m\r\n");
        onStatus?.("error", "Koneksi terputus");

        if (settings.autoReconnect) {
          term.write("\x1b[33mMenyambung kembali dalam 5 detik...\x1b[0m\r\n");
          reconnectTimeout = setTimeout(() => {
            if (!disposed) {
              void connect();
            }
          }, 5000);
        }
      }
    });

    return () => {
      disposed = true;
      ro.disconnect();
      dataSub.dispose();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      unlistenPromise.then((unlisten) => unlisten());
      if (sessionId !== null) void sessionClose(sessionId);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="terminal-wrapper" style={{ width: "100%", height: "100%" }} />;
});
