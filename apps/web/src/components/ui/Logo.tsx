/** WaferLens mark: a wafer disc seen through a lens. */
export function Logo({ size = 22, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 9.5h13M4.5 13h15M6 16.5h12" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
        <circle cx="14.5" cy="10" r="4.25" fill="var(--sage)" fillOpacity="0.18" stroke="var(--sage)" strokeWidth="1.5" />
      </svg>
      {withWord && <span className="logo-word">WaferLens</span>}
    </span>
  );
}
