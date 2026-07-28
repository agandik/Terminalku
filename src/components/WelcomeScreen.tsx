import { useState, useEffect } from "react";
import { Terminal, Radio, Cpu, Server, Plus, ShieldCheck, Layers, ArrowRight, Monitor } from "lucide-react";
import type { Protocol } from "../lib/types";
import { useTranslation } from "../lib/i18n";
import { TerminalkuLogo } from "./TerminalkuLogo";

interface WelcomeScreenProps {
  onNewSession: (proto?: Protocol) => void;
  onAddProfile: () => void;
  /** Langsung buka terminal lokal tanpa dialog form (opsional; jika tidak diset maka pakai onNewSession("local")) */
  onOpenLocalTerminal?: () => void;
}

const TYPING_COMMANDS = [
  "ssh admin@192.168.1.1",
  "telnet 10.10.10.15",
  "serial /dev/ttyUSB0 115200",
  "terminalku ready --connected",
];

function AnimatedTerminalLogo() {
  const [cmdIndex, setCmdIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetText = TYPING_COMMANDS[cmdIndex];
    const typingSpeed = isDeleting ? 35 : 75;
    const pauseDuration = isDeleting ? 200 : 2200;

    if (!isDeleting && displayedText === targetText) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setCmdIndex((prev) => (prev + 1) % TYPING_COMMANDS.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedText((prev) =>
        isDeleting ? targetText.slice(0, prev.length - 1) : targetText.slice(0, prev.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, cmdIndex]);

  return (
    <div className="animated-terminal-logo-box">
      <div className="terminal-logo-header">
        <div className="terminal-logo-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="terminal-logo-title">
          <TerminalkuLogo size={13} showTile={false} style={{ marginRight: 5 }} /> terminalku ~ bash
        </span>
      </div>
      <div className="terminal-logo-body">
        <span className="terminal-prompt">$</span>
        <span className="terminal-typed-text">{displayedText}</span>
        <span className="terminal-cursor">█</span>
      </div>
    </div>
  );
}

export function WelcomeScreen({ onNewSession, onAddProfile, onOpenLocalTerminal }: WelcomeScreenProps) {
  const { t } = useTranslation();

  const handleLocalTerminal = () => {
    if (onOpenLocalTerminal) {
      onOpenLocalTerminal();
    } else {
      onNewSession("local");
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <AnimatedTerminalLogo />
        <h1 className="welcome-title">{t.welcomeTitle}</h1>
        <p className="welcome-subtitle">{t.welcomeSubtitle}</p>

        <div className="welcome-actions">
          <button className="welcome-primary-btn" onClick={() => onNewSession("ssh")}>
            <Plus size={16} /> {t.newConnection} <ArrowRight size={14} />
          </button>
          <button className="welcome-local-btn" onClick={handleLocalTerminal}>
            <Monitor size={16} /> {t.localTerminal}
          </button>
          <button className="welcome-secondary-btn" onClick={onAddProfile}>
            {t.saveAccessProfile}
          </button>
        </div>
      </div>

      <div className="welcome-quick-protocols">
        <div className="proto-card" onClick={() => onNewSession("ssh")}>
          <div className="proto-icon ssh">
            <Terminal size={22} />
          </div>
          <div className="proto-info">
            <h4>{t.sshClientTitle}</h4>
            <p>{t.sshClientDesc}</p>
          </div>
        </div>

        <div className="proto-card" onClick={() => onNewSession("telnet")}>
          <div className="proto-icon telnet">
            <Radio size={22} />
          </div>
          <div className="proto-info">
            <h4>{t.telnetConsoleTitle}</h4>
            <p>{t.telnetConsoleDesc}</p>
          </div>
        </div>

        <div className="proto-card" onClick={() => onNewSession("serial")}>
          <div className="proto-icon serial">
            <Cpu size={22} />
          </div>
          <div className="proto-info">
            <h4>{t.serialConsoleTitle}</h4>
            <p>{t.serialConsoleDesc}</p>
          </div>
        </div>

        <div className="proto-card" onClick={() => onNewSession("ftp")}>
          <div className="proto-icon ftp">
            <Server size={22} />
          </div>
          <div className="proto-info">
            <h4>{t.ftpTitle}</h4>
            <p>{t.ftpDesc}</p>
          </div>
        </div>

        <div className="proto-card proto-card-local" onClick={handleLocalTerminal}>
          <div className="proto-icon local">
            <Monitor size={22} />
          </div>
          <div className="proto-info">
            <h4>{t.localTerminalTitle}</h4>
            <p>{t.localTerminalDesc}</p>
          </div>
        </div>
      </div>

      <div className="welcome-features">
        <div className="feature-item">
          <ShieldCheck size={18} className="feature-icon" />
          <span>{t.secureKeyringFeature}</span>
        </div>
        <div className="feature-item">
          <Layers size={18} className="feature-icon" />
          <span>{t.multiTabFeature}</span>
        </div>
      </div>
    </div>
  );
}
