import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "id";

export interface Translations {
  // App General
  appName: string;
  appSubtitle: string;
  cancel: string;
  save: string;
  close: string;
  delete: string;
  add: string;
  edit: string;
  search: string;
  none: string;

  // Welcome Screen
  welcomeTitle: string;
  welcomeSubtitle: string;
  newConnection: string;
  localTerminal: string;
  saveAccessProfile: string;
  sshClientTitle: string;
  sshClientDesc: string;
  telnetConsoleTitle: string;
  telnetConsoleDesc: string;
  serialConsoleTitle: string;
  serialConsoleDesc: string;
  ftpTitle: string;
  ftpDesc: string;
  localTerminalTitle: string;
  localTerminalDesc: string;
  secureKeyringFeature: string;
  multiTabFeature: string;

  // Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  appearanceSection: string;
  themeLabel: string;
  fontSizeLabel: string;
  fontFamilyLabel: string;
  fontPresetsLabel: string;
  memoryLogSection: string;
  scrollbackLabel: string;
  scrollbackHint: string;
  sessionLoggingTitle: string;
  sessionLoggingDesc: string;
  connectionSection: string;
  autoReconnectTitle: string;
  autoReconnectDesc: string;
  languageSection: string;
  languageLabel: string;

  // Mode Terang / Gelap (D-35)
  appThemeLabel: string;
  appThemeHint: string;
  modeLight: string;
  modeDark: string;
  modeSystem: string;
  modeSystemHint: string;
  switchToLight: string;
  switchToDark: string;

  // Auto-Update System
  updateTitle: string;
  updateAvailable: string;
  updateDesc: string;
  updateDownloading: string;
  updateReady: string;
  updateBtnNow: string;
  updateBtnLater: string;
  checkUpdateBtn: string;
  checkingUpdate: string;
  noUpdateAvailable: string;
  updateError: string;

  // TabBar & Split View
  newSessionTooltip: string;
  searchTooltip: string;
  hideSearchTooltip: string;
  commandRecTooltip: string;
  hideCommandRecTooltip: string;
  snippetLibTooltip: string;
  hideSnippetLibTooltip: string;
  compareModeTooltip: string;
  comparePopoverTitle: string;
  layoutModeLabel: string;
  layoutVertical: string;
  layoutHorizontal: string;
  compareSelectHint: string;
  currentlySplit: string;
  pairSession: string;
  unsplitAction: string;

  // Sidebar
  savedAccess: string;
  searchProfilePlaceholder: string;
  addProfileTooltip: string;
  exportProfilesTooltip: string;
  importProfilesTooltip: string;
  noProfilesFound: string;
  connect: string;

  // Command Palette
  palettePlaceholder: string;
  categoryProfile: string;
  categorySnippet: string;
  categoryAction: string;
  actNewSession: string;
  actLocalTerminal: string;
  actSnippets: string;
  actSnippetsSub: string;
  actCommands: string;
  actCommandsSub: string;
  actSettings: string;
  actExport: string;
  actExportSub: string;
  actImport: string;
  actImportSub: string;
}

const en: Translations = {
  appName: "Terminalku",
  appSubtitle: "Versatile desktop app for SSH, Telnet, Serial Console, FTP, and Local Terminal.",
  cancel: "Cancel",
  save: "Save Settings",
  close: "Close",
  delete: "Delete",
  add: "Add",
  edit: "Edit",
  search: "Search",
  none: "None",

  // Welcome Screen
  welcomeTitle: "Welcome to Terminalku",
  welcomeSubtitle: "Versatile desktop app for SSH, Telnet, Serial Console, FTP, and Local Terminal.",
  newConnection: "New Connection",
  localTerminal: "Local Terminal",
  saveAccessProfile: "Save Access Profile",
  sshClientTitle: "SSH Client",
  sshClientDesc: "Password & Key Authentication with secure encryption",
  telnetConsoleTitle: "Telnet Console",
  telnetConsoleDesc: "IAC negotiation & interactive terminal",
  serialConsoleTitle: "Serial Console",
  serialConsoleDesc: "Auto-detect USB/COM ports & baud rates",
  ftpTitle: "FTP / FTPS",
  ftpDesc: "Dual-pane file manager with TLS support",
  localTerminalTitle: "Local Terminal",
  localTerminalDesc: "Launch system shell ($SHELL) directly in tab",
  secureKeyringFeature: "Credentials securely stored in OS Keyring",
  multiTabFeature: "Parallel multi-tab without performance loss",

  // Settings Modal
  settingsTitle: "Application Settings",
  settingsSubtitle: "Customize terminal themes, fonts, logging, and connection preferences",
  appearanceSection: "Terminal Theme & Appearance",
  themeLabel: "Terminal Theme",
  fontSizeLabel: "Font Size",
  fontFamilyLabel: "Font Family",
  fontPresetsLabel: "Recommended Fonts:",
  memoryLogSection: "Terminal Memory & Logs",
  scrollbackLabel: "Scrollback Limit (Output History)",
  scrollbackHint: "Maximum output lines retained in memory buffer per tab.",
  sessionLoggingTitle: "Session Logging",
  sessionLoggingDesc: "Automatically log and export all terminal text output to local files.",
  connectionSection: "Connection Behavior",
  autoReconnectTitle: "Auto-Reconnect",
  autoReconnectDesc: "Automatically attempt reconnect if network connection drops.",
  languageSection: "Language / Bahasa",
  languageLabel: "Application Interface Language",

  appThemeLabel: "App Appearance",
  appThemeHint: "Applies to the app interface. The terminal color theme is set separately below.",
  modeLight: "Light",
  modeDark: "Dark",
  modeSystem: "System",
  modeSystemHint: "Follows your operating system setting",
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",

  // Auto-Update System
  updateTitle: "Application Update Available",
  updateAvailable: "A new version of Terminalku is ready to install!",
  updateDesc: "Upgrading to the latest version brings new features, security enhancements, and performance improvements.",
  updateDownloading: "Downloading & Installing update...",
  updateReady: "Update installed! Restarting Terminalku...",
  updateBtnNow: "Update Now",
  updateBtnLater: "Remind Me Later",
  checkUpdateBtn: "Check for Updates",
  checkingUpdate: "Checking for updates...",
  noUpdateAvailable: "Terminalku is up to date (latest version).",
  updateError: "Could not check for updates.",

  // TabBar & Split View
  newSessionTooltip: "New Session",
  searchTooltip: "Search Text in Terminal (Ctrl+F)",
  hideSearchTooltip: "Hide Search",
  commandRecTooltip: "Frequently Used Command Presets",
  hideCommandRecTooltip: "Hide Command Presets",
  snippetLibTooltip: "Snippet / Macro Library",
  hideSnippetLibTooltip: "Hide Snippet Library",
  compareModeTooltip: "Compare Mode (Split Terminal)",
  comparePopoverTitle: "Compare Sessions (Compare Mode)",
  layoutModeLabel: "Layout Mode:",
  layoutVertical: "Vertical (Left - Right)",
  layoutHorizontal: "Horizontal (Top - Bottom)",
  compareSelectHint: "Select a session to pair with",
  currentlySplit: "Currently Split",
  pairSession: "Pair →",
  unsplitAction: "Unsplit View (Restore Separate Tabs)",

  // Sidebar
  savedAccess: "SAVED ACCESS",
  searchProfilePlaceholder: "Search profile...",
  addProfileTooltip: "Add New Profile",
  exportProfilesTooltip: "Export Profiles to JSON",
  importProfilesTooltip: "Import Profiles from JSON",
  noProfilesFound: "No profiles found",
  connect: "Connect",

  // Command Palette
  palettePlaceholder: "Search commands, profiles, snippets...",
  categoryProfile: "Profile",
  categorySnippet: "Snippet",
  categoryAction: "App Action",
  actNewSession: "New Remote Session",
  actLocalTerminal: "Open Local Terminal",
  actSnippets: "Snippet / Macro Manager",
  actSnippetsSub: "Open saved command snippet library",
  actCommands: "Vendor Command Recommendations",
  actCommandsSub: "Open vendor command presets panel",
  actSettings: "Application Settings",
  actExport: "Export Profiles to JSON",
  actExportSub: "Save profile list to JSON file (without passwords)",
  actImport: "Import Profiles from JSON",
  actImportSub: "Load profile list from a JSON file",
};

const id: Translations = {
  appName: "Terminalku",
  appSubtitle: "Aplikasi desktop serbaguna untuk koneksi SSH, Telnet, Serial Console, FTP, dan Terminal Lokal.",
  cancel: "Batal",
  save: "Simpan Pengaturan",
  close: "Tutup",
  delete: "Hapus",
  add: "Tambah",
  edit: "Edit",
  search: "Cari",
  none: "Tidak ada",

  // Welcome Screen
  welcomeTitle: "Selamat Datang di Terminalku",
  welcomeSubtitle: "Aplikasi desktop serbaguna untuk koneksi SSH, Telnet, Serial Console, FTP, dan Terminal Lokal.",
  newConnection: "Koneksi Baru",
  localTerminal: "Terminal Lokal",
  saveAccessProfile: "Simpan Profil Akses",
  sshClientTitle: "SSH Client",
  sshClientDesc: "Auth Password & Key dengan enkripsi aman",
  telnetConsoleTitle: "Telnet Console",
  telnetConsoleDesc: "Negosiasi IAC & terminal interaktif",
  serialConsoleTitle: "Serial Console",
  serialConsoleDesc: "Auto-detect USB/COM port & baud rate",
  ftpTitle: "FTP / FTPS",
  ftpDesc: "Manajer berkas dual-pane & TLS support",
  localTerminalTitle: "Terminal Lokal",
  localTerminalDesc: "Buka shell sistem ($SHELL) langsung di tab",
  secureKeyringFeature: "Kredensial tersimpan aman di Secure Keyring OS",
  multiTabFeature: "Multi-tab paralel tanpa kompromi performa",

  // Settings Modal
  settingsTitle: "Pengaturan Aplikasi",
  settingsSubtitle: "Sesuaikan tema terminal, font, serta preferensi log & koneksi",
  appearanceSection: "Tampilan & Tema Terminal",
  themeLabel: "Tema Warna Terminal",
  fontSizeLabel: "Ukuran Font Terminal",
  fontFamilyLabel: "Font Family",
  fontPresetsLabel: "Rekomendasi Font:",
  memoryLogSection: "Memori Terminal & Log",
  scrollbackLabel: "Limit Scrollback (Output History)",
  scrollbackHint: "Maksimal baris riwayat teks yang disimpan di buffer terminal per tab.",
  sessionLoggingTitle: "Session Logging",
  sessionLoggingDesc: "Otomatis mencetak dan menyimpan seluruh riwayat teks keluaran terminal ke file lokal.",
  connectionSection: "Perilaku Koneksi",
  autoReconnectTitle: "Auto-Reconnect Otomatis",
  autoReconnectDesc: "Mencoba menghubungkan kembali sesi secara otomatis jika koneksi terputus tiba-tiba.",
  languageSection: "Bahasa / Language",
  languageLabel: "Bahasa Tampilan Aplikasi",

  appThemeLabel: "Tampilan Aplikasi",
  appThemeHint: "Berlaku untuk antarmuka aplikasi. Tema warna terminal diatur terpisah di bawah.",
  modeLight: "Terang",
  modeDark: "Gelap",
  modeSystem: "Sistem",
  modeSystemHint: "Mengikuti pengaturan sistem operasi",
  switchToLight: "Ganti ke mode terang",
  switchToDark: "Ganti ke mode gelap",

  // Auto-Update System
  updateTitle: "Pembaharuan Aplikasi Tersedia",
  updateAvailable: "Versi baru Terminalku telah siap untuk diinstall!",
  updateDesc: "Memperbarui ke versi terbaru membawa fitur baru, peningkatan keamanan, dan perbaikan performa.",
  updateDownloading: "Mengunduh & Memasang pembaharuan...",
  updateReady: "Pembaharuan terpasang! Memulai ulang Terminalku...",
  updateBtnNow: "Perbarui Sekarang",
  updateBtnLater: "Ingatkan Nanti",
  checkUpdateBtn: "Cari Pembaharuan",
  checkingUpdate: "Mengecek pembaharuan...",
  noUpdateAvailable: "Terminalku sudah menggunakan versi terbaru.",
  updateError: "Gagal mengecek pembaharuan.",

  // TabBar & Split View
  newSessionTooltip: "Sesi Baru",
  searchTooltip: "Cari Teks di Terminal (Ctrl+F)",
  hideSearchTooltip: "Sembunyikan Pencarian",
  commandRecTooltip: "Rekomendasi Command Sering Digunakan",
  hideCommandRecTooltip: "Sembunyikan Rekomendasi Command",
  snippetLibTooltip: "Snippet / Macro Library",
  hideSnippetLibTooltip: "Sembunyikan Snippet Library",
  compareModeTooltip: "Pilih Tab untuk Compare Mode",
  comparePopoverTitle: "Bandingkan Sesi (Compare Mode)",
  layoutModeLabel: "Mode Layout:",
  layoutVertical: "Vertikal (Kiri - Kanan)",
  layoutHorizontal: "Horizontal (Atas - Bawah)",
  compareSelectHint: "Pilih sesi yang ingin disandingkan dengan",
  currentlySplit: "Sedang Ter-split",
  pairSession: "Sandingkan →",
  unsplitAction: "Pisahkan Tampilan (Kembalikan Tab Normal)",

  // Sidebar
  savedAccess: "PROFIL AKSES",
  searchProfilePlaceholder: "Cari profil...",
  addProfileTooltip: "Tambah Profil Baru",
  exportProfilesTooltip: "Ekspor Profil ke JSON",
  importProfilesTooltip: "Impor Profil dari JSON",
  noProfilesFound: "Profil tidak ditemukan",
  connect: "Hubungkan",

  // Command Palette
  palettePlaceholder: "Cari perintah, profil, snippet...",
  categoryProfile: "Profil",
  categorySnippet: "Snippet",
  categoryAction: "Aksi Aplikasi",
  actNewSession: "Sesi Remote Baru",
  actLocalTerminal: "Buka Terminal Lokal",
  actSnippets: "Snippet / Macro Manager",
  actSnippetsSub: "Buka panel library command tersimpan",
  actCommands: "Rekomendasi Perintah Vendor",
  actCommandsSub: "Buka panel preset command vendor",
  actSettings: "Pengaturan Aplikasi",
  actExport: "Ekspor Profil ke JSON",
  actExportSub: "Simpan daftar profil ke file JSON (tanpa password)",
  actImport: "Impor Profil dari JSON",
  actImportSub: "Muat daftar profil dari file JSON",
};

const dictionaries: Record<Language, Translations> = { en, id };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("remote_app_language");
    return (saved === "id" || saved === "en") ? saved : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("remote_app_language", lang);
  };

  const t = dictionaries[language] || en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  return useContext(LanguageContext);
}
