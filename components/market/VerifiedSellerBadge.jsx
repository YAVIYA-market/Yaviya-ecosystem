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
        <circle cx="14" cy="14" r="13" fill="currentColor" />
        <path d="m8 7 6 7 6-7 M14 14v8" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="25" r="6" fill="#292524" stroke="white" strokeWidth="2" />
        <path d="m22.5 25 1.6 1.6 3.5-3.5" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <span>Vérifié par YAVIYA{demo ? " · démo" : ""}</span>}
      {compact && demo && <small>démo</small>}
    </span>
  );
}
