import Link from "next/link";
import { ChevronRight } from "../icons";

/** Visible but quiet: general guidance, not medical advice. Shown on every rehab screen. */
export function RehabDisclaimer() {
  return (
    <aside className="fs-rehab-note" aria-label="Safety">
      <p>
        <strong>General guidance, not medical advice.</strong> See a physiotherapist or doctor if pain is persistent, sharp or
        spreads down a limb, if you feel numbness or tingling, or after a recent injury. Stop any exercise that increases
        your pain.
      </p>
      <Link href="/health-disclaimer" className="fs-rehab-note__link">
        Read the health disclaimer
      </Link>
    </aside>
  );
}

/**
 * "Rehab · ~N min": the combined routine for the user's conditions. Used on Today (small,
 * optional) and on the workout finish summary.
 */
export function RehabCard({
  minutes,
  count,
  variant = "row",
  href = "/member"
}: {
  minutes: number;
  count: number;
  variant?: "row" | "summary";
  href?: string;
}) {
  return (
    <div className={`fs-group fs-rehab-card${variant === "summary" ? " fs-rehab-card--summary" : ""}`}>
      <Link href={href} className="fs-row fs-row--tap">
        <span className="fs-row__main">
          <span className="fs-row__title">Rehab · ~{minutes} min</span>
          <span className="fs-row__sub">
            {variant === "summary" ? "Cool down · " : ""}
            {count} {count === 1 ? "exercise" : "exercises"}
          </span>
        </span>
        <span className="fs-rehab-card__go">View</span>
        <ChevronRight size={18} className="fs-row__chev" />
      </Link>
    </div>
  );
}
