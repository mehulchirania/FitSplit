// Member Dashboard — Direction 1: "Today Card"
// Calm, coach-led. One scrolling view, no tabs.
// Hero: coach note + today's session with start CTA. Everything else collapsed.

const { useState: useStateM1, useEffect: useEffectM1 } = React;

function M1_TopBar({ m, onNotif }) {
  return (
    <div className="m1-top">
      <div className="m1-top__greet">
        <span className="m1-top__hi">Hi, {m.firstName}</span>
        <span className="m1-top__day">{m.todayLabel}</span>
      </div>
      <button className="m1-top__notif" onClick={onNotif} aria-label="Notifications">
        <window.MIcons.Bell size={20} />
        {m.coachNote.isUnread && <span className="m1-top__notif-dot" />}
      </button>
    </div>
  );
}

function M1_CoachCard({ note, onTap }) {
  return (
    <button className="m1-coach" onClick={onTap}>
      <span className="fm-avatar fm-avatar--md m1-coach__avatar">{note.avatar}</span>
      <div className="m1-coach__body">
        <div className="m1-coach__head">
          <span className="m1-coach__label">Note from Coach {note.from.split(" ")[0]}</span>
          {note.isUnread && <span className="m1-coach__new">NEW</span>}
        </div>
        <p className="m1-coach__msg">{note.message}</p>
        <span className="m1-coach__time">{note.sentAt}</span>
      </div>
    </button>
  );
}

function M1_TodayCard({ program, started, onStart, onComplete, completed }) {
  const totalSets = program.exercises.reduce((s, e) => s + e.sets, 0);
  const completedCount = completed.size;
  const pct = Math.round((completedCount / program.exercises.length) * 100);

  return (
    <section className="m1-today">
      <div className="m1-today__head">
        <div>
          <span className="m1-today__eyebrow">Today's session</span>
          <h2 className="m1-today__title">{program.dayLabel}</h2>
          <div className="m1-today__meta">
            <span><window.MIcons.Clock size={13} /> ~{program.durationMin} min</span>
            <span className="m1-today__sep">·</span>
            <span><window.MIcons.Dumbbell size={13} /> {program.exercises.length} lifts · {totalSets} sets</span>
          </div>
        </div>
        <div className="m1-today__week">
          <span>Week</span>
          <strong>{program.week}</strong>
          <small>/ 12</small>
        </div>
      </div>

      {!started ? (
        <>
          <ul className="m1-exlist">
            {program.exercises.slice(0, 4).map((ex) => (
              <li key={ex.id}>
                <span className="m1-exlist__dot" />
                <div className="m1-exlist__name">
                  {ex.name}
                  <span className="m1-exlist__sub">{ex.sets} × {ex.reps}</span>
                </div>
                <span className="m1-exlist__w">{ex.suggested}<small>kg</small></span>
              </li>
            ))}
            {program.exercises.length > 4 && (
              <li className="m1-exlist__more">+{program.exercises.length - 4} more lifts</li>
            )}
          </ul>
          <button className="fm-btn fm-btn--brand fm-btn--lg fm-btn--block" onClick={onStart}>
            <window.MIcons.Play size={16} /> Start workout
          </button>
        </>
      ) : (
        <>
          <div className="m1-progress">
            <div className="m1-progress__bar">
              <div className="m1-progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="m1-progress__label">{completedCount} of {program.exercises.length} done · {pct}%</span>
          </div>
          <ul className="m1-exlist m1-exlist--active">
            {program.exercises.map((ex) => {
              const isDone = completed.has(ex.id);
              return (
                <li key={ex.id} className={isDone ? "m1-exlist__row--done" : ""}>
                  <button
                    className={`m1-exlist__check ${isDone ? "m1-exlist__check--on" : ""}`}
                    onClick={() => onComplete(ex.id)}
                    aria-label={isDone ? `Undo ${ex.name}` : `Mark ${ex.name} complete`}
                  >
                    {isDone && <window.MIcons.Check size={14} />}
                  </button>
                  <div className="m1-exlist__name">
                    {ex.name}
                    <span className="m1-exlist__sub">{ex.sets} × {ex.reps} · Last: {ex.lastWeight}kg</span>
                  </div>
                  <span className="m1-exlist__w">{ex.suggested}<small>kg</small></span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function M1_WeekStrip({ days, streak }) {
  return (
    <section className="m1-week">
      <div className="m1-week__head">
        <div>
          <span className="m1-week__label">This week</span>
          <div className="m1-week__streak">
            <window.MIcons.Flame size={15} /> {streak}-week streak
          </div>
        </div>
        <a className="m1-week__link">Calendar →</a>
      </div>
      <div className="m1-week__row">
        {days.map((d, i) => (
          <div
            key={i}
            className={`m1-week__day m1-week__day--${d.kind}`}
            title={d.label}
          >
            <span className="m1-week__dot" />
            <span className="m1-week__date">{d.date}</span>
            <span className="m1-week__name">{d.day}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function M1_QuickTiles({ m, onLog }) {
  return (
    <div className="m1-tiles">
      <button className="m1-tile">
        <div className="m1-tile__icon m1-tile__icon--brand">
          <window.MIcons.Heart size={16} />
        </div>
        <div className="m1-tile__body">
          <span className="m1-tile__label">Membership</span>
          <strong className="m1-tile__value">Active</strong>
          <span className="m1-tile__sub">Renews in {m.daysToExpiry} days</span>
        </div>
        <window.MIcons.ChevR size={14} />
      </button>
      <button className="m1-tile" onClick={onLog}>
        <div className="m1-tile__icon m1-tile__icon--accent">
          <window.MIcons.Activity size={16} />
        </div>
        <div className="m1-tile__body">
          <span className="m1-tile__label">Body weight</span>
          <strong className="m1-tile__value">{m.body.weightKg}<small>kg</small></strong>
          <span className="m1-tile__sub m1-tile__sub--good">
            <window.MIcons.TrendUp size={11} /> {Math.abs(m.body.weightChange)}kg this week
          </span>
        </div>
        <window.MIcons.ChevR size={14} />
      </button>
    </div>
  );
}

function M1_PT({ pt }) {
  return (
    <section className="m1-pt">
      <span className="fm-avatar fm-avatar--md">{pt.avatar}</span>
      <div className="m1-pt__body">
        <span className="m1-pt__label">Upcoming PT · {pt.focus}</span>
        <strong className="m1-pt__time">{pt.when}</strong>
        <span className="m1-pt__sub">{pt.duration} min with {pt.trainer}</span>
      </div>
      <div className="m1-pt__cta">
        <button className="fm-btn fm-btn--ghost fm-btn--sm">Reschedule</button>
      </div>
    </section>
  );
}

function MemberOne() {
  const m = window.MOCK_MEMBER;
  const [started, setStarted] = useStateM1(false);
  const [completed, setCompleted] = useStateM1(new Set());
  const [toast, setToast] = useStateM1(null);
  const [tab, setTab] = useStateM1("home");

  function start() {
    setStarted(true);
    setToast("Workout started · Form > reps");
    setTimeout(() => setToast(null), 1800);
  }
  function complete(id) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        const ex = m.program.exercises.find((e) => e.id === id);
        setToast(`Logged ${ex.name}`);
        setTimeout(() => setToast(null), 1500);
      }
      return next;
    });
  }

  return (
    <div className="fm m1-screen">
      <div className="fm-screen">
        <div className="fm-scroll m1-scroll">
          <M1_TopBar m={m} onNotif={() => setToast("3 notifications")} />

          {m.coachNote.isUnread && (
            <div className="m1-pad">
              <M1_CoachCard
                note={m.coachNote}
                onTap={() => setToast(`Opening message from ${m.coachNote.from}`)}
              />
            </div>
          )}

          <div className="m1-pad">
            <M1_TodayCard
              program={m.program}
              started={started}
              onStart={start}
              onComplete={complete}
              completed={completed}
            />
          </div>

          <div className="m1-pad">
            <M1_WeekStrip days={m.weekStrip} streak={m.weeklyStreak} />
          </div>

          <div className="m1-pad">
            <M1_PT pt={m.upcomingPT} />
          </div>

          <div className="m1-pad m1-pad--tight">
            <M1_QuickTiles
              m={m}
              onLog={() => setToast("Body weight log opened")}
            />
          </div>

          {/* Bottom space so tab bar doesn't hide content */}
          <div style={{ height: 100 }} />
        </div>

        {toast && (
          <div className="fm-toast">
            <window.MIcons.CheckCircle size={16} /> {toast}
          </div>
        )}

        <nav className="fm-tabbar">
          {[
            { v: "home", label: "Today", icon: <window.MIcons.Home size={22} /> },
            { v: "train", label: "Train", icon: <window.MIcons.Dumbbell size={22} /> },
            { v: "progress", label: "Progress", icon: <window.MIcons.Chart size={22} /> },
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

window.MemberOne = MemberOne;
