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
          d="M12 2 21 6v6c0 5-4.1 8.4-9 10-4.9-1.6-9-5-9-10V6l9-4Z"
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
