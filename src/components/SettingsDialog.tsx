import { useState, useEffect, useRef } from "react";
import { Settings, X, Palette, Type, RefreshCw, HardDrive, ShieldCheck, Check, Globe, Sun, Moon, Monitor, Sparkles } from "lucide-react";
import { useTranslation, type Language } from "../lib/i18n";
import { useTheme, type ThemeMode } from "../lib/theme";
import { checkForAppUpdates } from "./UpdateDialog";
import type { Update } from "@tauri-apps/plugin-updater";

export interface AppSettings {
  theme: string;
  fontSize: number;
  fontFamily: string;
  scrollback: number;
  autoReconnect: boolean;
  enableLogging: boolean;
}

interface SettingsDialogProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
  onShowUpdate?: (update: Update) => void;
}

const FONT_PRESETS = [
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "Consolas",
  "monospace",
];

const THEME_OPTIONS = [
  { id: "termius", name: "Termius Dark (Default)", desc: "Sorotan otomatis IP, Interface & Status" },
  { id: "tokyoNight", name: "Tokyo Night", desc: "Biru gelap dengan aksen neon segar" },
  { id: "catppuccin", name: "Catppuccin Macchiato", desc: "Tema pastel gelap yang lembut" },
  { id: "oneDark", name: "One Dark Pro", desc: "Tema klasik VS Code / Atom" },
  { id: "dracula", name: "Dracula", desc: "Tema gelap ungu kontras tinggi" },
  { id: "monokai", name: "Monokai", desc: "Sorotan kuning & magenta terang" },
  { id: "solarized", name: "Solarized Dark", desc: "Tema cyan teal bernuansa lembut" },
  { id: "dark", name: "Default Dark", desc: "Tema abu-abu gelap minimalis" },
  { id: "light", name: "Default Light", desc: "Tema terang bersih" },
];

const THEME_MODES: { id: ThemeMode; icon: typeof Sun }[] = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
  { id: "system", icon: Monitor },
];

export function SettingsDialog({ onSave, onCancel, onShowUpdate }: SettingsDialogProps) {
  const { t, language, setLanguage } = useTranslation();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [theme, setTheme] = useState("termius");
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("monospace");
  const [scrollback, setScrollback] = useState(5000);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [enableLogging, setEnableLogging] = useState(false);

  const [draftLanguage, setDraftLanguage] = useState<Language>(language);
  const [draftThemeMode, setDraftThemeMode] = useState<ThemeMode>(themeMode);

  const initialThemeModeRef = useRef<ThemeMode>(themeMode);
  const initialLanguageRef = useRef<Language>(language);
  const isSavedRef = useRef<boolean>(false);

  const handleSelectThemeMode = (mode: ThemeMode) => {
    setDraftThemeMode(mode);
    setThemeMode(mode); // LIVE PREVIEW INSTAN DI UI!
  };

  const handleCancel = () => {
    if (!isSavedRef.current) {
      // Rollback ke mode tema & bahasa awal sebelum modal dibuka jika tidak diklik Save!
      setThemeMode(initialThemeModeRef.current);
      setLanguage(initialLanguageRef.current);
    }
    onCancel();
  };

  useEffect(() => {
    return () => {
      if (!isSavedRef.current) {
        setThemeMode(initialThemeModeRef.current);
        setLanguage(initialLanguageRef.current);
      }
    };
  }, []);

  const [initialValues, setInitialValues] = useState<{
    theme: string;
    fontSize: number;
    fontFamily: string;
    scrollback: number;
    autoReconnect: boolean;
    enableLogging: boolean;
    themeMode: ThemeMode;
    language: Language;
  } | null>(null);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    let curTheme = "termius";
    let curFontSize = 14;
    let curFontFamily = "monospace";
    let curScrollback = 5000;
    let curAutoReconnect = false;
    let curEnableLogging = false;

    const saved = localStorage.getItem("remote_app_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        curTheme = parsed.theme || "termius";
        curFontSize = parsed.fontSize || 14;
        curFontFamily = parsed.fontFamily || "monospace";
        curScrollback = parsed.scrollback || 5000;
        curAutoReconnect = parsed.autoReconnect || false;
        curEnableLogging = parsed.enableLogging || false;
      } catch (err) {
        console.error(err);
      }
    }

    setTheme(curTheme);
    setFontSize(curFontSize);
    setFontFamily(curFontFamily);
    setScrollback(curScrollback);
    setAutoReconnect(curAutoReconnect);
    setEnableLogging(curEnableLogging);

    setInitialValues({
      theme: curTheme,
      fontSize: curFontSize,
      fontFamily: curFontFamily,
      scrollback: curScrollback,
      autoReconnect: curAutoReconnect,
      enableLogging: curEnableLogging,
      themeMode: initialThemeModeRef.current,
      language: initialLanguageRef.current,
    });
  }, []);

  const hasChanges =
    initialValues !== null &&
    (theme !== initialValues.theme ||
      fontSize !== initialValues.fontSize ||
      fontFamily !== initialValues.fontFamily ||
      scrollback !== initialValues.scrollback ||
      autoReconnect !== initialValues.autoReconnect ||
      enableLogging !== initialValues.enableLogging ||
      draftThemeMode !== initialValues.themeMode ||
      draftLanguage !== initialValues.language);

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      const u = await checkForAppUpdates();
      if (u) {
        handleCancel();
        onShowUpdate?.(u);
      } else {
        setUpdateMsg(t.noUpdateAvailable);
      }
    } catch {
      setUpdateMsg(t.updateError);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isSavedRef.current = true; // Tandai bahwa user menyetujui & menyimpan pengaturan
    setThemeMode(draftThemeMode);
    setLanguage(draftLanguage);

    const settings: AppSettings = {
      theme,
      fontSize,
      fontFamily,
      scrollback,
      autoReconnect,
      enableLogging,
    };
    localStorage.setItem("remote_app_settings", JSON.stringify(settings));
    onSave(settings);
  };

  return (
    <div className="profile-form-overlay" onClick={handleCancel}>
      <form
        className="settings-modal-card"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="settings-modal-header">
          <div className="settings-modal-title-group">
            <div className="settings-icon-badge">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="settings-modal-title">{t.settingsTitle}</h2>
              <p className="settings-modal-subtitle">{t.settingsSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="settings-close-btn"
            onClick={handleCancel}
            title={t.close}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Modal (Scrollable) */}
        <div className="settings-modal-body">
          {/* Seksi Bahasa / Language */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Globe size={15} />
              <span>{t.languageSection}</span>
            </div>

            <div className="settings-field">
              <label htmlFor="setting-language">{t.languageLabel}</label>
              <select
                id="setting-language"
                className="settings-select-input"
                value={draftLanguage}
                onChange={(e) => setDraftLanguage(e.target.value as Language)}
              >
                <option value="en">English (US) — Default</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
          </div>

          {/* Seksi 1: Tema & Tampilan */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Palette size={15} />
              <span>{t.appearanceSection}</span>
            </div>

            {/* Mode terang/gelap UI aplikasi — terpisah dari tema warna terminal (D-35) */}
            <div className="settings-field">
              <label>{t.appThemeLabel}</label>
              <div className="theme-mode-segmented" role="group" aria-label={t.appThemeLabel}>
                {THEME_MODES.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`theme-mode-btn ${draftThemeMode === id ? "active" : ""}`}
                    onClick={() => handleSelectThemeMode(id)}
                    aria-pressed={draftThemeMode === id}
                  >
                    <Icon size={14} />
                    <span>
                      {id === "light" ? t.modeLight : id === "dark" ? t.modeDark : t.modeSystem}
                    </span>
                  </button>
                ))}
              </div>
              <span className="settings-field-hint">
                {draftThemeMode === "system" ? t.modeSystemHint : t.appThemeHint}
              </span>
            </div>

            <div className="settings-field">
              <label htmlFor="setting-theme">{t.themeLabel}</label>
              <select
                id="setting-theme"
                className="settings-select-input"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {THEME_OPTIONS.map((tItem) => (
                  <option key={tItem.id} value={tItem.id}>
                    {tItem.name} — {tItem.desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-grid-2">
              <div className="settings-field">
                <label htmlFor="setting-font-size">{t.fontSizeLabel}</label>
                <div className="settings-number-input-wrap">
                  <input
                    id="setting-font-size"
                    type="number"
                    min={10}
                    max={32}
                    className="settings-text-input"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    required
                  />
                  <span className="settings-input-unit">px</span>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="setting-font-family">{t.fontFamilyLabel}</label>
                <input
                  id="setting-font-family"
                  type="text"
                  className="settings-text-input"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  placeholder="monospace"
                  required
                />
              </div>
            </div>

            {/* Quick Font Presets */}
            <div className="font-preset-wrap">
              <span className="font-preset-label">{t.fontPresetsLabel}</span>
              <div className="font-preset-chips">
                {FONT_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`font-chip ${fontFamily === f ? "active" : ""}`}
                    onClick={() => setFontFamily(f)}
                  >
                    {fontFamily === f && <Check size={12} style={{ marginRight: 3 }} />}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seksi 2: Terminal & Scrollback */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Type size={15} />
              <span>{t.memoryLogSection}</span>
            </div>

            <div className="settings-field">
              <label htmlFor="setting-scrollback">{t.scrollbackLabel}</label>
              <div className="settings-number-input-wrap">
                <input
                  id="setting-scrollback"
                  type="number"
                  min={100}
                  max={100000}
                  step={100}
                  className="settings-text-input"
                  value={scrollback}
                  onChange={(e) => setScrollback(Number(e.target.value))}
                  required
                />
                <span className="settings-input-unit">lines</span>
              </div>
              <span className="settings-field-hint">{t.scrollbackHint}</span>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <div className="settings-toggle-title">
                  <HardDrive size={15} />
                  <span>{t.sessionLoggingTitle}</span>
                </div>
                <div className="settings-toggle-desc">{t.sessionLoggingDesc}</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={enableLogging}
                  onChange={(e) => setEnableLogging(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* Seksi 3: Opsi Koneksi */}
          <div className="settings-section">
            <div className="settings-section-title">
              <ShieldCheck size={15} />
              <span>{t.connectionSection}</span>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <div className="settings-toggle-title">
                  <RefreshCw size={15} />
                  <span>{t.autoReconnectTitle}</span>
                </div>
                <div className="settings-toggle-desc">{t.autoReconnectDesc}</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* Seksi 4: Pembaharuan Aplikasi */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Sparkles size={15} />
              <span>{t.updateTitle}</span>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <div className="settings-toggle-title">
                  <span>Terminalku v0.1.0</span>
                </div>
                <div className="settings-toggle-desc">
                  {updateMsg || t.checkUpdateBtn}
                </div>
              </div>
              <button
                type="button"
                className="settings-cancel-btn"
                style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={handleManualCheckUpdate}
                disabled={checkingUpdate}
              >
                <RefreshCw size={13} className={checkingUpdate ? "spin-icon" : ""} />
                {checkingUpdate ? t.checkingUpdate : t.checkUpdateBtn}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="settings-modal-footer">
          <button type="button" className="settings-cancel-btn" onClick={handleCancel}>
            {t.cancel}
          </button>
          <button type="submit" className="settings-save-btn" disabled={!hasChanges}>
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
