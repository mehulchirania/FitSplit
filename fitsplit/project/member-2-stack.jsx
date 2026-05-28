// Member Dashboard — Direction 2: "Stack" (fitness-tracker style)
// Energetic, data-rich. Vertical sections, no tabs.
// Hero is a weekly progress ring; below: today, week chart, PRs, body, macros.

const { useState: useStateM2 } = React;

function Ring({ size = 110, stroke = 10, value, target, label, sub, color }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / target));
  return (
    <div className="fm-ring m2-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fm-ring__bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fm-ring__fg"
          stroke={color || "var(--brand)"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="m2-ring__center">
        <strong>{value}<span>/{target}</span></strong>
        <small>{label}</small>
        {sub && <span className="m2-ring__sub">{sub}</span>}
      </div>
    </div>
  );
}

function M2_Hero({ m }) {
  return (
    <header className="m2-hero">
      <div className="m2-hero__top">
        <div className="m2-hero__greet">
          <span className="fm-avatar fm-avatar--md">{m.avatarInitials}</span>
          <div>
            <div className="m2-hero__hi">Hi, {m.firstName}</div>
            <div className="m2-hero__sub">{m.todayLabel}</div>
          </div>
        </div>
        <button className="m2-hero__bell">
          <window.MIcons.Bell size={20} />
          <span className="m2-hero__bell-dot" />
        </button>
      </div>

      <div className="m2-hero__panel">
        <Ring
          value={m.daysTrainedThisWeek}
          target={m.weeklyTarget}
          label="days this week"
        />
        <div className="m2-hero__stats">
          <div className="m2-stat">
            <span className="m2-stat__icon" style={{ background: "color-mix(in srgb, #e8a224 22%, transparent)", color: "var(--gold)" }}>
              <window.MIcons.Flame size={14} />
            </span>
            <div>
              <strong>{m.weeklyStreak}</strong>
              <small>week streak</small>
            </div>
          </div>
          <div className="m2-stat">
            <span className="m2-stat__icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
              <window.MIcons.Dumbbell size={14} />
            </span>
            <div>
              <strong>{m.setsThisWeek}</strong>
              <small>sets · +{m.setsThisWeek - m.setsLastWeek} vs last</small>
            </div>
          </div>
          <div className="m2-stat">
            <span className="m2-stat__icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <window.MIcons.Trophy size={14} />
            </span>
            <div>
              <strong>{m.bestSet.weight}<small>kg</small></strong>
              <small>PR · {m.bestSet.exercise}</small>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function M2_Coach({ note }) {
  return (
    <div className="m2-coach">
      <span className="fm-avatar fm-avatar--sm">{note.avatar}</span>
      <div>
        <span className="m2-coach__label">Coach {note.from.split(" ")[0]}</span>
        <p>{note.message}</p>
      </div>
      <span className="m2-coach__chev"><window.MIcons.ChevR size={16} /></span>
    </div>
  );
}

function M2_Today({ program, onStart }) {
  const totalSets = program.exercises.reduce((s, e) => s + e.sets, 0);
  return (
    <section className="m2-today">
      <div className="m2-today__head">
        <div className="m2-today__pulse" />
        <div className="m2-today__copy">
          <span className="m2-today__eyebrow">Today · Week {program.week}, Day {program.day}</span>
          <h2>{program.dayLabel}</h2>
        </div>
      </div>

      <div className="m2-today__meta">
        <div>
          <span>Lifts</span>
          <strong>{program.exercises.length}</strong>
        </div>
        <div>
          <span>Sets</span>
          <strong>{totalSets}</strong>
        </div>
        <div>
          <span>Est. time</span>
          <strong>{program.durationMin}<small>m</small></strong>
        </div>
      </div>

      <div className="m2-today__lifts">
        {program.exercises.slice(0, 3).map((ex) => (
          <span key={ex.id} className="m2-today__chip">{ex.name}</span>
        ))}
        <span className="m2-today__chip m2-today__chip--more">+{program.exercises.length - 3}</span>
      </div>

      <button className="fm-btn fm-btn--brand fm-btn--lg fm-btn--block" onClick={onStart}>
        <window.MIcons.Play size={16} /> Start session
      </button>
    </section>
  );
}

function M2_WeekChart({ weekStrip }) {
  // mock sets per day
  const data = [
    { day: "M", date: 25, sets: 18, isToday: false, kind: "lift" },
    { day: "T", date: 26, sets: 22, isToday: false, kind: "lift" },
    { day: "W", date: 27, sets: 0, isToday: false, kind: "rest" },
    { day: "T", date: 28, sets: 19, isToday: false, kind: "lift" },
    { day: "F", date: 29, sets: 0, isToday: true, kind: "today" },
    { day: "S", date: 30, sets: 0, isToday: false, kind: "planned" },
    { day: "S", date: 31, sets: 0, isToday: false, kind: "rest" }
  ];
  const max = Math.max(...data.map((d) => d.sets), 24);
  return (
    <section className="m2-section">
      <div className="fm-section-h">
        <h2>This week</h2>
        <a>Details →</a>
      </div>
      <div className="m2-chart">
        <div className="m2-chart__y">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="m2-chart__bars">
          {data.map((d, i) => {
            const h = d.sets / max * 100;
            return (
              <div key={i} className={`m2-bar m2-bar--${d.kind}`}>
                <div className="m2-bar__col">
                  {d.sets > 0 && (
                    <div className="m2-bar__fill" style={{ height: `${h}%` }}>
                      <span className="m2-bar__value">{d.sets}</span>
                    </div>
                  )}
                  {d.kind === "today" && <div className="m2-bar__today">●</div>}
                  {d.kind === "planned" && <div className="m2-bar__planned" />}
                  {d.kind === "rest" && d.sets === 0 && <div className="m2-bar__rest">rest</div>}
                </div>
                <span className="m2-bar__date">{d.date}</span>
                <span className="m2-bar__day">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function M2_PRs({ prs }) {
  return (
    <section className="m2-section">
      <div className="fm-section-h">
        <h2>Recent PRs</h2>
        <a>All lifts →</a>
      </div>
      <div className="m2-prs">
        {prs.map((pr, i) => (
          <div key={i} className="m2-pr">
            <div className="m2-pr__icon">
              <window.MIcons.Trophy size={16} />
            </div>
            <div className="m2-pr__body">
              <strong>{pr.exercise}</strong>
              <span>{pr.weight}kg × {pr.reps} reps · {pr.when}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function M2_Body({ body, macros }) {
  const kcalPct = Math.round((macros.kcal.actual / macros.kcal.target) * 100);
  return (
    <section className="m2-section">
      <div className="fm-section-h">
        <h2>Body & nutrition</h2>
        <a>Log →</a>
      </div>
      <div className="m2-body">
        <div className="m2-body__weight">
          <span className="m2-body__label">Weight</span>
          <strong>{body.weightKg}<small>kg</small></strong>
          <span className="m2-body__delta">
            <window.MIcons.TrendUp size={12} /> {Math.abs(body.weightChange)}kg this wk
          </span>
        </div>

        <div className="m2-body__macros">
          <div className="m2-body__macros-head">
            <span>Today's macros</span>
            <strong>{macros.kcal.actual}<small>/ {macros.kcal.target} kcal</small></strong>
          </div>
          <div className="m2-macro-row">
            <div className="m2-macro">
              <span>Protein</span>
              <div className="m2-macro__bar">
                <div className="m2-macro__fill m2-macro__fill--p" style={{ width: `${(macros.protein.actual / macros.protein.target) * 100}%` }} />
              </div>
              <small>{macros.protein.actual}/{macros.protein.target}g</small>
            </div>
            <div className="m2-macro">
              <span>Carbs</span>
              <div className="m2-macro__bar">
                <div className="m2-macro__fill m2-macro__fill--c" style={{ width: `${(macros.carbs.actual / macros.carbs.target) * 100}%` }} />
              </div>
              <small>{macros.carbs.actual}/{macros.carbs.target}g</small>
            </div>
            <div className="m2-macro">
              <span>Fat</span>
              <div className="m2-macro__bar">
                <div className="m2-macro__fill m2-macro__fill--f" style={{ width: `${(macros.fat.actual / macros.fat.target) * 100}%` }} />
              </div>
              <small>{macros.fat.actual}/{macros.fat.target}g</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberTwo() {
  const m = window.MOCK_MEMBER;
  const [tab, setTab] = useStateM2("home");
  const [toast, setToast] = useStateM2(null);

  function start() {
    setToast("Session started");
    setTimeout(() => setToast(null), 1500);
  }

  return (
    <div className="fm m2-screen">
      <div className="fm-screen">
        <div className="fm-scroll m2-scroll">
          <M2_Hero m={m} />

          <div className="m2-pad">
            <M2_Coach note={m.coachNote} />
          </div>

          <div className="m2-pad">
            <M2_Today program={m.program} onStart={start} />
          </div>

          <div className="m2-pad">
            <M2_WeekChart weekStrip={m.weekStrip} />
          </div>

          <div className="m2-pad">
            <M2_PRs prs={m.prs} />
          </div>

          <div className="m2-pad">
            <M2_Body body={m.body} macros={m.macros} />
          </div>

          <div style={{ height: 110 }} />
        </div>

        {toast && (
          <div className="fm-toast">
            <window.MIcons.CheckCircle size={16} /> {toast}
          </div>
        )}

        <nav className="fm-tabbar">
          {[
            { v: "home", label: "Home", icon: <window.MIcons.Home size={22} /> },
            { v: "train", label: "Train", icon: <window.MIcons.Dumbbell size={22} /> },
            { v: "progress", label: "Stats", icon: <window.MIcons.Chart size={22} /> },
            { v: "profile", label: "Profile", icon: <window.MIcons.User size={22} /> }
          ].map((t) => (
            <button
              key={t.v}
              className={`fm-tabbar__item ${tab === t.v ? "fm-tabbar__item--on" : ""}`}
              onClick={() => setTab(t.v)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

window.MemberTwo = MemberTwo;
