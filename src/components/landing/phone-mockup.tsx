// Decorative HTML/CSS rendering of the workout screen. No images; purely
// presentational, so it is hidden from assistive tech.

const SETS = [
  { n: 1, kg: "22.5", reps: "10", done: true },
  { n: 2, kg: "22.5", reps: "10", done: true },
  { n: 3, kg: "25", reps: "8", done: false, active: true },
  { n: 4, kg: "25", reps: "8", done: false }
];

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PhoneMockup() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone__screen">
        <div className="lp-phone__status">
          <span>9:41</span>
          <span className="lp-phone__island" />
          <span className="lp-phone__battery" />
        </div>

        <div className="lp-phone__head">
          <span className="lp-phone__eyebrow">Push day · Week 3</span>
          <strong className="lp-phone__title">Incline Dumbbell Press</strong>
          <span className="lp-phone__rest">Rest 1:24</span>
        </div>

        <div className="lp-phone__sets">
          {SETS.map((s) => (
            <div key={s.n} className={`lp-set${s.active ? " is-active" : ""}${s.done ? " is-done" : ""}`}>
              <span className="lp-set__n">{s.n}</span>
              <span className="lp-set__val">
                {s.kg}
                <small> kg</small>
              </span>
              <span className="lp-set__val">
                {s.reps}
                <small> reps</small>
              </span>
              <span className="lp-set__mark">{s.done ? <Check /> : null}</span>
            </div>
          ))}
        </div>

        <div className="lp-phone__cta">Log set 3</div>
        <p className="lp-phone__prev">Last week: 22.5 kg × 10</p>
        <span className="lp-phone__home" />
      </div>
    </div>
  );
}
