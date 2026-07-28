import { useTheme } from "../lib/theme";

interface TerminalkuLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showTile?: boolean;
}

/**
 * Geometri diekstrak dari mockup referensi lewat analisis piksel (grid 1024×1024),
 * jadi bentuknya identik dengan desain — bukan perkiraan manual.
 *
 * Warna dibaca dari context tema, bukan CSS, supaya logo ikut tombol toggle di
 * TitleBar — bukan cuma ikut tema OS. Untuk favicon/<img> pakai `public/logo.svg`
 * yang hanya bisa ikut prefers-color-scheme.
 */
export function TerminalkuLogo({ size = 20, className = "", style, showTile = true }: TerminalkuLogoProps) {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const tile = isLight ? "#f1f5f9" : "#2b2b2b";
  const slate = isLight ? "#334155" : "#4b545f";
  const green = isLight ? "#059669" : "#28ba70";

  // Tanpa tile, viewBox dirapatkan ke bounding box emblem supaya tidak ada padding kosong.
  const viewBox = showTile ? "0 0 1024 1024" : "314 298 453 418";

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Terminalku"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      {showTile && <rect x="173" y="173" width="679" height="679" rx="150" fill={tile} />}

      {/* Palang atas kiri: corong yang menyempit ke bawah */}
      <path d="M314 298 H558 L452 392 H374 Z" fill={slate} />
      {/* Palang atas kanan: sisi kiri tegak, sisi kanan miring */}
      <path d="M574 298 H709 L649 392 H574 Z" fill={green} />

      {/* Batang tengah, dipotong dua diagonal sejajar */}
      <path d="M566 302 V470 L457 557 V399 Z" fill={slate} />
      <path d="M566 480 V609 L457 690 V567 Z" fill={green} />
      <path d="M566 619 V716 H457 V700 Z" fill={slate} />

      {/* Kursor underscore, rata bawah dengan batang */}
      <rect x="602" y="690" width="165" height="26" rx="6" fill={green} />
    </svg>
  );
}
