export function FitnessLoader() {
  return (
    <div className="fitness-loading" role="status" aria-label="Loading">
      {/* Barbell SVG */}
      <svg
        aria-hidden="true"
        className="fitness-loading-barbell"
        fill="none"
        height="28"
        viewBox="0 0 72 28"
        width="72"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left outer plate */}
        <rect fill="currentColor" height="20" opacity="0.55" rx="2.5" width="8" x="0" y="4" />
        {/* Left inner plate */}
        <rect fill="currentColor" height="14" rx="2" width="6" x="8" y="7" />
        {/* Bar */}
        <rect fill="currentColor" height="4" opacity="0.4" rx="2" width="36" x="14" y="12" />
        {/* Right inner plate */}
        <rect fill="currentColor" height="14" rx="2" width="6" x="50" y="7" />
        {/* Right outer plate */}
        <rect fill="currentColor" height="20" opacity="0.55" rx="2.5" width="8" x="56" y="4" />
        {/* Collar left */}
        <rect fill="currentColor" height="8" opacity="0.8" rx="1.5" width="4" x="14" y="10" />
        {/* Collar right */}
        <rect fill="currentColor" height="8" opacity="0.8" rx="1.5" width="4" x="54" y="10" />
      </svg>

      <div className="fitness-loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <p className="fitness-loading-label">Loading</p>
    </div>
  );
}
