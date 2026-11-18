export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lvg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#11151b" stroke="#33404f" />
      <path d="M12 7h8M14 7v7l-5.5 9.5A2 2 0 0 0 10.2 26h11.6a2 2 0 0 0 1.7-2.5L18 14V7" fill="none" stroke="url(#lvg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="21" r="1.4" fill="#22d3ee" />
      <circle cx="18.5" cy="19" r="1" fill="#3b82f6" />
    </svg>
  );
}
