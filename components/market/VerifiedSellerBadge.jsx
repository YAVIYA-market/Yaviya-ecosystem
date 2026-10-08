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
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="m12 1.5 2.7 1.7 3.2-.1 1.4 2.9 2.7 1.7-.4 3.2 1.1 3-2.1 2.4-.6 3.2-3.2.7-2.5 2-3-1.1-3.2.4L4.7 19l-2.9-1.4.1-3.2L.2 11.7l1.7-2.7-.1-3.2 2.9-1.4 1.7-2.7 3.2.4Z"
        />
        <path
          d="m7.5 12 3 3 6-6"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && <span>Vendeur vérifié{demo ? " · démo" : ""}</span>}
      {compact && demo && <small>démo</small>}
    </span>
  );
}
