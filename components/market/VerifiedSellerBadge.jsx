export default function VerifiedSellerBadge({
  verified,
  demo = false,
  compact = false,
}) {
  if (!verified) return null;
  const label = demo
    ? "Vendeur vérifié · démonstration"
    : "Vendeur vérifié par YAVIYA";
  return (
    <span className="yv-verified-badge" title={label} aria-label={label}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M14.00,1.00 L16.87,3.28 L20.50,2.74 L21.85,6.15 L25.26,7.50 L24.72,11.13 L27.00,14.00 L24.72,16.87 L25.26,20.50 L21.85,21.85 L20.50,25.26 L16.87,24.72 L14.00,27.00 L11.13,24.72 L7.50,25.26 L6.15,21.85 L2.74,20.50 L3.28,16.87 L1.00,14.00 L3.28,11.13 L2.74,7.50 L6.15,6.15 L7.50,2.74 L11.13,3.28 Z" fill="currentColor" />
        <path d="m10 9 4 5 4-5 M14 14v5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="25" r="6" fill="#292524" stroke="white" strokeWidth="2" />
        <path d="m22.5 25 1.6 1.6 3.5-3.5" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <span>Vérifié par YAVIYA{demo ? " · démo" : ""}</span>}
      {compact && demo && <small>démo</small>}
    </span>
  );
}
