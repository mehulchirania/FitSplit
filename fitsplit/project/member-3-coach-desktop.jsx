// Member Dashboard — Direction 3 Desktop variant
// Coach-led, desktop layout. Sidebar nav + 2-column main area.
// Reuses the same data and visual language as the mobile version.

const { useState: useStateM3D } = React;

function M3D_Sidebar({ tab, setTab }) {
  const items = [
    { v: "coach", label: "Coach", icon: <window.MIcons.Mail size={18} /> },
    { v: "train", label: "Train", icon: <window.MIcons.Dumbbell size={18} /> },
    { v: "progress", label: "Progress", icon: <window.MIcons.Chart size={18} /> },
    { v: "calendar", label: "Calendar", icon: <window.MIcons.Calendar size={18} /> },
    { v: "body", label: "Body", icon: <window.MIcons.Heart size={18} /> }
  ];
  return (
    <aside className="m3d-side">
      <div className="m3d-side__logo">
        <div className="m3d-side__logo-mark">
          <window.MIcons.Lightning size={18} />
        </div>
        <span>FitSplit</span>
      </div>
      <nav className="m3d-side__nav">
        {items.map((it) => (
          <button
            key={it.v}
            className={`m3d-side__item ${tab === it.v ? "m3d-side__item--on" : ""}`}
            onClick={() => setTab(it.v)}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="m3d-side__bottom">
        <button className="m3d-side__item">
          <window.MIcons.Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

function M3D_TopBar({ m, onToast }) {
  return (
    <header className="m3d-top">
      <div className="m3d-top__crumbs">
        <a className="m3d-top__crumb">Dashboard</a>
        <span className="m3d-top__crumb-sep">/</span>
        <span className="m3d-top__crumb m3d-top__crumb--current">Today</span>
      </div>
      <div className="m3d-top__right">
        <div className="m3d-top__search">
          <window.MIcons.Search size={14} />
          <input placeholder="Search exercises, lifts…" />
          <kbd>⌘K</kbd>
        </div>
        <button className="m3d-top__icon" onClick={() => onToast("3 notifications")}>
          <window.MIcons.Bell size={18} />
          <span className="m3d-top__icon-dot" />
        </button>
        <div className="m3d-top__profile">
          <span className="fm-avatar fm-avatar--sm">{m.avatarInitials}</span>
          <div className="m3d-top__profile-text">
            <strong>{m.firstName}</strong>
            <small>{m.gymName.split(" · ")[0]}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function M3D_PageHeader({ m }) {
  return (
    <div className="m3d-pagehead">
      <div>
        <span className="m3d-pagehead__eyebrow">{m.todayLabel}</span>
        <h1 className="m3d-pagehead__title">Hi, {m.firstName} — let's train.</h1>
      </div>
      <div className="m3d-pagehead__chips">
        <div className="m3d-chip">
          <window.MIcons.Flame size={14} />
          <strong>{m.weeklyStreak}<small>w</small></strong>
          <span>streak</span>
        </div>
        <div className="m3d-chip">
          <window.MIcons.Dumbbell size={14} />
          <strong>{m.daysTrainedThisWeek}<small>/{m.weeklyTarget}</small></strong>
          <span>this week</span>
        </div>
        <div className="m3d-chip">
          <window.MIcons.Trophy size={14} />
          <strong>{m.bestSet.weight}<small>kg</small></strong>
          <span>PR · Bench</span>
        </div>
      </div>
    </div>
  );
}

function M3D_CoachHero({ note, replyText, setReplyText, onSend }) {
  return (
    <section className="m3d-coach">
      <div className="m3d-coach__bg">
        <div className="m3d-coach__bg-a" />
        <div className="m3d-coach__bg-b" />
      </div>
      <div className="m3d-coach__inner">
        <div className="m3d-coach__head">
          <span className="fm-avatar fm-avatar--xl m3d-coach__avatar">{note.avatar}</span>
          <div className="m3d-coach__info">
            <span className="m3d-coach__label">YOUR COACH</span>
            <strong>{note.from}</strong>
            <span className="m3d-coach__online">
              <span className="m3d-coach__online-dot" /> Online · usually replies in 30 min
            </span>
          </div>
          <button className="fm-btn fm-btn--ghost fm-btn--sm">
            <window.MIcons.Mail size={13} /> Full thread
          </button>
        </div>

        <div className="m3d-coach__bubble">
          <p>{note.message}</p>
          <span className="m3d-coach__time">{note.sentAt}</span>
        </div>

        <div className="m3d-coach__reply">
          <input
            type="text"
            placeholder="Reply to Coach…"
            className="m3d-coach__input"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
          />
          <div className="m3d-coach__quick">
            {["Got it 👍", "On it!", "Quick question…"].map((q) => (
              <button
                key={q}
                className="m3d-coach__quick-btn"
                onClick={() => { setReplyText(q); onSend(q); }}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            className={`m3d-coach__send ${replyText ? "m3d-coach__send--on" : ""}`}
            onClick={() => onSend()}
            disabled={!replyText}
            aria-label="Send"
          >
            <window.MIcons.Send size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

function M3D_Today({ program, isStarted, completed, onStart, onComplete }) {
  const totalSets = program.exercises.reduce((s, e) => s + e.sets, 0);
  const pct = isStarted ? Math.round((completed.size / program.exercises.length) * 100) : 0;
  return (
    <section className="m3d-today">
      <div className="m3d-today__head">
        <div>
          <div className="m3d-today__eyebrow">
            <window.MIcons.Note size={13} />
            Your coach's plan for today
          </div>
          <h2 className="m3d-today__title">{program.dayLabel}</h2>
          <span className="m3d-today__sub">
            Week {program.week} · {program.exercises.length} lifts · {totalSets} sets · est. {program.durationMin} min
          </span>
        </div>
        <div className="m3d-today__cta">
          {!isStarted ? (
            <button className="fm-btn fm-btn--brand fm-btn--lg" onClick={onStart}>
              <window.MIcons.Play size={16} /> Start workout
            </button>
          ) : (
            <div className="m3d-today__active">
              <div className="m3d-today__active-bar">
                <div className="m3d-today__active-fill" style={{ width: `${pct}%` }} />
              </div>
              <span>{completed.size} of {program.exercises.length} · {pct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="m3d-today__exercises">
        {program.exercises.map((ex, idx) => {
          const done = completed.has(ex.id);
          return (
            <div key={ex.id} className={`m3d-ex ${done ? "m3d-ex--done" : ""}`}>
              <div className="m3d-ex__num">{idx + 1}</div>
              <div className="m3d-ex__body">
                <div className="m3d-ex__name">{ex.name}</div>
                <div className="m3d-ex__group">{ex.muscleGroup}</div>
              </div>
              <div className="m3d-ex__sets">
                <small>SETS × REPS</small>
                <strong>{ex.sets} × {ex.reps}</strong>
              </div>
              <div className="m3d-ex__last">
                <small>LAST</small>
                <strong>{ex.lastWeight}<span>kg</span></strong>
              </div>
              <div className="m3d-ex__target">
                <small>COACH'S TARGET</small>
                <strong className={ex.suggested > ex.lastWeight ? "m3d-ex__target--bump" : ""}>
                  {ex.suggested}<span>kg</span>
                  {ex.suggested > ex.lastWeight && <em>↑</em>}
                </strong>
              </div>
              {isStarted ? (
                <button
                  className={`m3d-ex__check ${done ? "m3d-ex__check--on" : ""}`}
                  onClick={() => onComplete(ex.id)}
                  aria-label={done ? `Undo ${ex.name}` : `Complete ${ex.name}`}
                >
                  {done && <window.MIcons.Check size={14} />}
                </button>
              ) : (
                <button className="m3d-ex__open" aria-label="Open details">
                  <window.MIcons.ChevR size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function M3D_PT({ pt }) {
  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <window.MIcons.Calendar size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">UPCOMING PT</span>
          <strong className="m3d-card__title">{pt.focus}</strong>
        </div>
      </div>
      <div className="m3d-pt-row">
        <div>
          <span>When</span>
          <strong>{pt.when}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{pt.duration} min</strong>
        </div>
        <div>
          <span>With</span>
          <strong>{pt.trainer}</strong>
        </div>
      </div>
      <div className="m3d-pt-actions">
        <button className="fm-btn fm-btn--ghost fm-btn--sm">Reschedule</button>
        <button className="fm-btn fm-btn--subtle fm-btn--sm">View details</button>
      </div>
    </section>
  );
}

function M3D_PRs({ prs }) {
  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
          <window.MIcons.Trophy size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">RECENT PRs</span>
          <strong className="m3d-card__title">Personal records</strong>
        </div>
      </div>
      <ul className="m3d-prs">
        {prs.map((pr, i) => (
          <li key={i}>
            <div>
              <strong>{pr.exercise}</strong>
              <span>{pr.when}</span>
            </div>
            <span className="m3d-prs__weight">{pr.weight}<small>kg × {pr.reps}</small></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function M3D_Body({ body, macros }) {
  const kcalPct = Math.round((macros.kcal.actual / macros.kcal.target) * 100);
  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
          <window.MIcons.Heart size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">BODY · TODAY</span>
          <strong className="m3d-card__title">Weight & macros</strong>
        </div>
        <button className="fm-btn fm-btn--ghost fm-btn--sm m3d-body-log">
          <window.MIcons.Plus size={13} /> Log
        </button>
      </div>
      <div className="m3d-body-row">
        <div className="m3d-body-stat">
          <span>Weight</span>
          <strong>{body.weightKg}<small>kg</small></strong>
          <em>{body.weightChange < 0 ? "↓" : "↑"} {Math.abs(body.weightChange)}kg</em>
        </div>
        <div className="m3d-body-stat">
          <span>Sleep</span>
          <strong>{body.sleepHrs}<small>h</small></strong>
          <em>last night</em>
        </div>
        <div className="m3d-body-stat">
          <span>BMI</span>
          <strong>{body.bmi}</strong>
          <em>healthy range</em>
        </div>
      </div>
      <div className="m3d-macros">
        <div className="m3d-macros__head">
          <span>Today's intake</span>
          <strong>{macros.kcal.actual}<small> / {macros.kcal.target} kcal · {kcalPct}%</small></strong>
        </div>
        <div className="m3d-macros__row">
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Protein</span><small>{macros.protein.actual}/{macros.protein.target}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--p" style={{ width: `${(macros.protein.actual / macros.protein.target) * 100}%` }} /></div>
          </div>
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Carbs</span><small>{macros.carbs.actual}/{macros.carbs.target}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--c" style={{ width: `${(macros.carbs.actual / macros.carbs.target) * 100}%` }} /></div>
          </div>
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Fat</span><small>{macros.fat.actual}/{macros.fat.target}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--f" style={{ width: `${(macros.fat.actual / macros.fat.target) * 100}%` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function M3D_Membership({ m }) {
  return (
    <section className="m3d-card m3d-membership">
      <div>
        <span className="m3d-card__eyebrow">MEMBERSHIP</span>
        <strong>Active · {m.program.title}</strong>
        <small>Renews in {m.daysToExpiry} days · {new Date(m.membershipExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
      </div>
      <button className="fm-btn fm-btn--ghost fm-btn--sm">Manage</button>
    </section>
  );
}

function MemberThreeDesktop() {
  const m = window.MOCK_MEMBER;
  const [tab, setTab] = useStateM3D("coach");
  const [replyText, setReplyText] = useStateM3D("");
  const [toast, setToast] = useStateM3D(null);
  const [isStarted, setIsStarted] = useStateM3D(false);
  const [completed, setCompleted] = useStateM3D(new Set());

  function send(text) {
    const msg = text || replyText;
    if (!msg) return;
    setReplyText("");
    setToast(`Sent to ${m.coachNote.from}: "${msg}"`);
    setTimeout(() => setToast(null), 2200);
  }
  function start() {
    setIsStarted(true);
    setToast("Workout started · Form > reps");
    setTimeout(() => setToast(null), 1800);
  }
  function complete(id) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fm m3d-root">
      <M3D_Sidebar tab={tab} setTab={setTab} />
      <div className="m3d-main">
        <M3D_TopBar m={m} onToast={(t) => { setToast(t); setTimeout(() => setToast(null), 1800); }} />
        <div className="m3d-content">
          <M3D_PageHeader m={m} />

          <div className="m3d-grid">
            <div className="m3d-grid__left">
              <M3D_CoachHero
                note={m.coachNote}
                replyText={replyText}
                setReplyText={setReplyText}
                onSend={send}
              />
              <M3D_Today
                program={m.program}
                isStarted={isStarted}
                completed={completed}
                onStart={start}
                onComplete={complete}
              />
            </div>
            <div className="m3d-grid__right">
              <M3D_PT pt={m.upcomingPT} />
              <M3D_Body body={m.body} macros={m.macros} />
              <M3D_PRs prs={m.prs} />
              <M3D_Membership m={m} />
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className="fm-toast m3d-toast">
          <window.MIcons.CheckCircle size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

window.MemberThreeDesktop = MemberThreeDesktop;
