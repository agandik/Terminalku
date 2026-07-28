// Dedicated Panel: Terminal Search (Cari teks di terminal via xterm SearchAddon)

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";

interface SearchPanelProps {
  onClose: () => void;
  onNext: (query: string) => void;
  onPrev: (query: string) => void;
  onClear: () => void;
}

export function SearchPanel({ onClose, onNext, onPrev, onClear }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev(query);
      } else {
        onNext(query);
      }
    }
    if (e.key === "Escape") {
      setQuery("");
      onClear();
      onClose();
    }
  };

  const handleChange = (val: string) => {
    setQuery(val);
    if (val) {
      onNext(val);
    } else {
      onClear();
    }
  };

  return (
    <div className="right-panel search-panel">
      {/* Header */}
      <div className="rp-header">
        <div className="rp-title">
          <Search size={14} className="rp-title-icon" />
          <span>Cari di Terminal</span>
        </div>
        <button className="rp-close" onClick={onClose} title="Tutup Pencarian (Esc)">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="rp-body">
        <div className="rp-search">
          <div className="rp-search-bar">
            <Search size={14} className="rp-search-icon" />
            <input
              ref={inputRef}
              className="rp-search-input"
              type="text"
              placeholder="Ketik kata kunci..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
            {query && (
              <button
                className="rp-search-clear"
                onClick={() => {
                  setQuery("");
                  onClear();
                  inputRef.current?.focus();
                }}
                title="Hapus kata kunci"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="rp-search-actions">
            <button
              className="rp-search-btn"
              onClick={() => onPrev(query)}
              disabled={!query}
              title="Sebelumnya (Shift+Enter)"
            >
              <ChevronUp size={14} /> Prev
            </button>
            <button
              className="rp-search-btn"
              onClick={() => onNext(query)}
              disabled={!query}
              title="Berikutnya (Enter)"
            >
              <ChevronDown size={14} /> Next
            </button>
          </div>

          <div className="rp-search-hint-box">
            <p className="rp-search-hint">
              <kbd>Enter</kbd> selanjutnya
            </p>
            <p className="rp-search-hint">
              <kbd>Shift+Enter</kbd> sebelumnya
            </p>
            <p className="rp-search-hint">
              <kbd>Esc</kbd> tutup & bersihkan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
