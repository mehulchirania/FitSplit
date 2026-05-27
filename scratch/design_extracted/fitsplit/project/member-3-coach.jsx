// Member Dashboard — Direction 3: "Coach-led"
// Conversational, coach-as-protagonist. Big coach card up top with note + reply.
// Today's session presented as the coach's prescription.

const { useState: useStateM3 } = React;

function M3_TopBar({ m }) {
  return (
    <div className="m3-top">
      <div>
        <span className="m3-top__gym">{m.gymName}</span>
        <div className="m3-top__hi">Hi, {m.firstName} 👋</div>
      </div>
      <div className="m3-top__right">
        <button className="m3-top__icon" aria-label="Notifications">
          <window.MIcons.Bell size={18} />
          <span className="m3-top__icon-dot" />
        </button>
        <span className="fm-avatar fm-avatar--md">{m.avatarInitials}</span>
      </div>
    </div>
  );
}

function M3_CoachHero({ note, replyText, setReplyText, onSend }) {
  return (
    <section className="m3-coach">
      <div className="m3-coach__bg">
        <div className="m3-coach__bg-bubble m3-coach__bg-bubble--a" />
        <div className="m3-coach__bg-bubble m3-coach__bg-bubble--b" />
      </div>
      <div className="m3-coach__content">
        <div className="m3-coach__head">
          <span className="fm-avatar fm-avatar--lg m3-coach__avatar">{note.avatar}</span>
          <div className="m3-coach__info">
            <span className="m3-coach__label">YOUR COACH</span>
            <strong>{note.from}</strong>
            <span className="m3-coach__online">
              <span className="m3-coach__online-dot" /> Online · usually replies in 30 min
            </span>
          </div>
        </div>

        <div className="m3-coach__bubble">
          <p>{note.message}</p>
          <span className="m3-coach__time">{note.sentAt}</span>
        </div>

        <div className="m3-coach__reply">
          <input
            type="text"
            placeholder="Reply to Coach…"
            className="m3-coach__input"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
          />
          <div className="m3-coach__quick">
            {["Got it 👍", "On it!", "Question…"].map((q) => (
              <button key={q} className="m3-coach__quick-btn" onClick={() => { setReplyText(q); onSend(q); }}>{q}</button>
            ))}
          </div>
          <button
            className={`m3-coach__send ${replyText ? "m3-coach__send--on" : ""}`}
            onClick={() => onSend()}
            aria-label="Send"
            disabled={!replyText}
          >
            <window.MIcons.Send size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function M3_Today({ program, onStart, isStarted, completed, onComplete }) {
  const totalSets = program.exercises.reduce((s, e) => s + e.sets, 0);
  const pct = isStarted ? Math.round((completed.size / program.exercises.length) * 100) : 0;
  return (
    <section className="m3-today">
      <div className="m3-today__eyebrow">
        <window.MIcons.Note size={13} />
        Your coach's plan for today
      </div>
      <div className="m3-today__head">
        <div>
          <h2 className="m3-today__title">{program.dayLabel}</h2>
          <span className="m3-today__sub">Week {program.week} · {program.exercises.length} lifts · {totalSets} sets · ~{program.durationMin}m</span>
        </div>
        {!isStarted && (
          <div className="m3-today__day-num">
            <strong>{program.day}</strong>
            <small>of week</small>
          </div>
        )}
      </div>

      {isStarted && (
        <div className="m3-today__progress">
          <div className="m3-today__progress-bar">
            <div className="m3-today__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>{completed.size} / {program.exercises.length} done</span>
        </div>
      )}

      <div className="m3-today__exercises">
        {program.exercises.map((ex, idx) => {
          const done = completed.has(ex.id);
          return (
            <div key={ex.id} className={`m3-ex ${done ? "m3-ex--done" : ""}`}>
              <div className="m3-ex__num">{idx + 1}</div>
              <div className="m3-ex__body">
                <div className="m3-ex__name">{ex.name}</div>
                <div className="m3-ex__meta">
                  <span>{ex.sets} × {ex.reps}</span>
                  <span className="m3-ex__sep">·</span>
                  <span className="m3-ex__last">Last {ex.lastWeight}kg</span>
                  {ex.suggested > ex.lastWeight && (
                    <span className="m3-ex__bump">↑ try {ex.suggested}kg</span>
                  )}
                </div>
              </div>
              {isStarted && (
                <button
                  className={`m3-ex__check ${done ? "m3-ex__check--on" : ""}`}
                  onClick={() => onComplete(ex.id)}
                  aria-label={done ? `Undo ${ex.name}` : `Complete ${ex.name}`}
                >
                  {done && <window.MIcons.Check size={14} />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!isStarted ? (
        <button className="fm-btn fm-btn--brand fm-btn--lg fm-btn--block" onClick={onStart}>
          <window.MIcons.Play size={16} /> Start workout
        </button>
      ) : (
        <button className="fm-btn fm-btn--subtle fm-btn--block" onClick={() => {}}>
          <window.MIcons.Note size={14} /> Add a session note
        </button>
      )}
    </section>
  );
}

function M3_PT({ pt, onMessage }) {
  return (
    <section className="m3-pt">
      <div className="m3-pt__icon">
        <window.MIcons.Calendar size={18} />
      </div>
      <div className="m3-pt__body">
        <span className="m3-pt__label">UPCOMING PT</span>
        <strong>{pt.when}</strong>
        <span className="m3-pt__sub">{pt.focus} · {pt.duration} min</span>
      </div>
      <button className="m3-pt__chev" onClick={onMessage} aria-label="Open">
        <window.MIcons.ChevR size={16} />
      </button>
    </section>
  );
}

function M3_Stats({ m }) {
  return (
    <section className="m3-stats">
      <h3 className="m3-stats__title">Your progress</h3>
      <div className="m3-stats__grid">
        <div className="m3-stat">
          <div className="m3-stat__icon" style={{ color: "var(--gold)" }}>
            <window.MIcons.Flame size={16} />
          </div>
          <strong>{m.weeklyStreak}<small>w</small></strong>
          <span>streak</span>
        </div>
        <div className="m3-stat">
          <div className="m3-stat__icon" style={{ color: "var(--brand)" }}>
            <window.MIcons.Dumbbell size={16} />
          </div>
          <strong>{m.daysTrainedThisWeek}<small>/{m.weeklyTarget}</small></strong>
          <span>this week</span>
        </div>
        <div className="m3-stat">
          <div className="m3-stat__icon" style={{ color: "var(--accent)" }}>
            <window.MIcons.Trophy size={16} />
          </div>
          <strong>{m.bestSet.weight}<small>kg</small></strong>
          <span>bench PR</span>
        </div>
        <div className="m3-stat">
          <div className="m3-stat__icon" style={{ color: "var(--danger)" }}>
            <window.MIcons.Heart size={16} />
          </div>
          <strong>{m.body.weightKg}<small>kg</small></strong>
          <span>body wt.</span>
        </div>
      </div>
    </section>
  );
}

function M3_Membership({ m }) {
  return (
    <section className="m3-membership">
      <div>
        <span className="m3-membership__label">Membership</span>
        <strong>Active · renews in {m.daysToExpiry} days</strong>
      </div>
      <button className="fm-btn fm-btn--ghost fm-btn--sm">Manage</button>
    </section>
  );
}

function MemberThree() {
  const m = window.MOCK_MEMBER;
  const [tab, setTab] = useStateM3("home");
  const [replyText, setReplyText] = useStateM3("");
  const [toast, setToast] = useStateM3(null);
  const [isStarted, setIsStarted] = useStateM3(false);
  const [completed, setCompleted] = useStateM3(new Set());

  function send(text) {
    const msg = text || replyText;
    if (!msg) return;
    setReplyText("");
    setToast(`Sent to ${m.coachNote.from}: "${msg}"`);
    setTimeout(() => setToast(null), 2200);
  }

  function start() {
    setIsStarted(true);
    setToast("Let's go. Form > reps.");
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
    <div className="fm m3-screen">
      <div className="fm-screen">
        <div className="fm-scroll m3-scroll">
          <M3_TopBar m={m} />

          <div className="m3-pad">
            <M3_CoachHero
              note={m.coachNote}
              replyText={replyText}
              setReplyText={setReplyText}
              onSend={send}
            />
          </div>

          <div className="m3-pad">
            <M3_Today
              program={m.program}
              onStart={start}
              isStarted={isStarted}
              completed={completed}
              onComplete={complete}
            />
          </div>

          <div className="m3-pad">
            <M3_PT pt={m.upcomingPT} onMessage={() => setToast("Opening PT details")} />
          </div>

          <div className="m3-pad">
            <M3_Stats m={m} />
          </div>

          <div className="m3-pad">
            <M3_Membership m={m} />
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
            { v: "home", label: "Coach", icon: <window.MIcons.Mail size={22} /> },
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

window.MemberThree = MemberThree;
