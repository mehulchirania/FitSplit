// Owner Dashboard — Direction 3: "Command Room"
// Split-screen control-room layout. No tabs, no scrolling reels.
// Left half: actionable feed (priorities + people). Right half: live ops (gym state).

const { useState: useStateO3 } = React;

function O3_Header({ d, onToast, actions }) {
  const k = d.kpis;
  return (
    <div className="o3-head">
      <div className="o3-head__left">
        <span className="o3-head__eyebrow">{d.todayLabel}</span>
        <h1>Command room</h1>
        <p>{actions.length} priorities · {d.inGymRightNow.length} training now · {d.ptSessions.filter(s => s.status === "upcoming").length} PT sessions ahead</p>
      </div>
      <div className="o3-head__right">
        <div className="o3-pulse-card">
          <span className="o3-pulse-card__label">Right now</span>
          <strong>{d.inGymRightNow.length}<small>/{k.capacity}</small></strong>
          <span className="o3-pulse-card__sub">
            <span className="o3-pulse-dot" /> Live
          </span>
        </div>
        <div className="o3-stat-grid">
          <div>
            <span>Total members</span>
            <strong>{k.totalMembers}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{k.activeMembers}</strong>
          </div>
          <div>
            <span>Revenue MTD</span>
            <strong>{k.currency}{(k.revenueMTD / 1000).toFixed(1)}k</strong>
          </div>
          <div>
            <span>Pending pmt.</span>
            <strong>{k.pendingPayments}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function O3_PrioritiesPanel({ actions, filter, setFilter, onAction, onDismiss }) {
  const filtered = filter === "all" ? actions : actions.filter((a) => a.kind === filter);
  const counts = {
    expired: actions.filter((a) => a.kind === "expired").length,
    payment: actions.filter((a) => a.kind === "payment").length,
    expiring: actions.filter((a) => a.kind === "expiring").length,
    noplan: actions.filter((a) => a.kind === "noplan").length
  };
  return (
    <section className="o3-panel o3-priorities">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">PRIORITY · LIVE</span>
          <h2>Triage queue</h2>
        </div>
        <div className="o3-priorities__tabs">
          {[
            { v: "all", l: "All", c: actions.length },
            { v: "expired", l: "Expired", c: counts.expired },
            { v: "payment", l: "Payment", c: counts.payment },
            { v: "expiring", l: "Expiring", c: counts.expiring },
            { v: "noplan", l: "No plan", c: counts.noplan }
          ].map((f) => (
            <button
              key={f.v}
              className={`o3-priorities__tab ${filter === f.v ? "o3-priorities__tab--on" : ""}`}
              onClick={() => setFilter(f.v)}
            >
              {f.l}
              <span>{f.c}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="o3-panel__body">
        {filtered.length === 0 ? (
          <div className="o3-empty">
            <window.MIcons.Trophy size={28} />
            <strong>Queue clear</strong>
            <p>Nothing left in this bucket.</p>
          </div>
        ) : (
          <div className="o3-actions-list">
            {filtered.map((a) => (
              <O3_ActionRow key={a.id} a={a} onAction={onAction} onDismiss={onDismiss} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function O3_ActionRow({ a, onAction, onDismiss }) {
  const cfg = {
    expired: { tag: "EXPIRED", primary: "Renew" },
    payment: { tag: "PAYMENT", primary: "Approve" },
    expiring: { tag: "EXPIRING", primary: "Send link" },
    noplan: { tag: "NO PLAN", primary: "Assign" }
  }[a.kind];
  const money = a.value ? `₹${a.value.toLocaleString("en-IN")}` : null;
  const ageLabel = a.age > 0 ? `${a.age}d ago` : "today";
  return (
    <div className={`o3-row o3-row--${a.kind}`}>
      <span className={`o3-row__tag o3-row__tag--${a.kind}`}>{cfg.tag}</span>
      <div className="o3-row__body">
        <strong>{a.who}</strong>
        <span>{a.subtitle}</span>
      </div>
      <div className="o3-row__meta">
        {money && <span className="o3-row__money">{money}</span>}
        <span className="o3-row__age">{ageLabel}</span>
      </div>
      <div className="o3-row__cta">
        <button className="fm-btn fm-btn--brand fm-btn--sm" onClick={() => onAction(a.kind, a)}>
          {cfg.primary}
        </button>
        <button
          className="o3-row__dismiss"
          onClick={() => onDismiss(a.id)}
          aria-label="Snooze"
          title="Snooze"
        >
          <window.MIcons.X size={12} />
        </button>
      </div>
    </div>
  );
}

function O3_FloorMap({ floor, total }) {
  return (
    <section className="o3-panel">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">LIVE · OCCUPANCY</span>
          <h2>Floor map</h2>
        </div>
        <span className="o3-panel__pill">
          {total} <small>/ 35</small>
        </span>
      </div>
      <div className="o3-panel__body">
        <div className="o3-zones">
          {floor.map((z) => {
            const pct = Math.round((z.current / z.capacity) * 100);
            const tone = pct > 80 ? "hot" : pct > 50 ? "med" : pct > 0 ? "calm" : "empty";
            return (
              <div key={z.zone} className={`o3-zone o3-zone--${tone}`}>
                <div className="o3-zone__top">
                  <span>{z.zone}</span>
                  <strong>{z.current}<small>/{z.capacity}</small></strong>
                </div>
                <div className="o3-zone__bar">
                  <div className="o3-zone__fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="o3-zone__pct">{pct}% full</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function O3_LiveRoster({ inGymNow }) {
  return (
    <section className="o3-panel">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">{inGymNow.length} TRAINING NOW</span>
          <h2>Live roster</h2>
        </div>
        <a className="o3-link">All →</a>
      </div>
      <div className="o3-panel__body">
        <div className="o3-roster">
          {inGymNow.map((m) => (
            <div key={m.id} className="o3-roster__row">
              <span className="fm-avatar fm-avatar--sm">{m.initials}</span>
              <div className="o3-roster__id">
                <strong>{m.name}</strong>
                <small>{m.trainer ? `coached by ${m.trainer}` : "self"}</small>
              </div>
              <span className="o3-roster__time">{m.since}<small>m</small></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function O3_PTSchedule({ sessions }) {
  return (
    <section className="o3-panel">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">TODAY · {sessions.length} SESSIONS</span>
          <h2>PT schedule</h2>
        </div>
        <a className="o3-link">Book →</a>
      </div>
      <div className="o3-panel__body o3-panel__body--flush">
        <ul className="o1-pt">
          {sessions.map((s) => (
            <li key={s.id} className={`o1-pt__row o1-pt__row--${s.status}`}>
              <div className="o1-pt__time">{s.time}</div>
              <div className="o1-pt__body">
                <strong>{s.member}</strong>
                <small>{s.focus} · {s.trainer}</small>
              </div>
              <span className={`o1-pt__pill o1-pt__pill--${s.status}`}>
                {s.status === "completed" ? "Done" : s.status === "in_progress" ? "Live" : "Upcoming"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function O3_Notif({ notifications }) {
  const verbFor = {
    joined: "joined the gym",
    payment: "submitted a payment",
    session_done: "completed a session",
    pr: "hit a new PR",
    expiring: "membership expiring",
    feedback: "left feedback"
  };
  return (
    <section className="o3-panel">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">FEED</span>
          <h2>Activity</h2>
        </div>
        <a className="o3-link">All →</a>
      </div>
      <div className="o3-panel__body">
        {notifications.slice(0, 5).map((n) => (
          <div key={n.id} className="o-notif">
            <div className="o-notif__icon"><window.MIcons.User size={12} /></div>
            <div className="o-notif__body">
              <strong>{n.who}</strong> {n.note || verbFor[n.kind]}
              <small>{n.at}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function O3_Attendance({ data, currency, revenueMTD }) {
  const max = Math.max(...data);
  return (
    <section className="o3-panel">
      <div className="o3-panel__head">
        <div>
          <span className="o3-panel__eyebrow">14 DAYS</span>
          <h2>Attendance</h2>
        </div>
        <a className="o3-link">Reports →</a>
      </div>
      <div className="o3-panel__body">
        <div className="o1-bars" style={{ height: 90 }}>
          {data.map((v, i) => {
            const h = (v / max) * 100;
            const isToday = i === data.length - 1;
            return (
              <div key={i} className="o1-bar">
                <div className={`o1-bar__fill ${isToday ? "o1-bar__fill--today" : ""}`} style={{ height: `${h}%` }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OwnerThree() {
  const d = window.MOCK_OWNER;
  const [actions, setActions] = useStateO3(d.actions);
  const [filter, setFilter] = useStateO3("all");
  const [toast, setToast] = useStateO3(null);
  const [sideTab, setSideTab] = useStateO3("dashboard");

  function action(kind, a) {
    const labels = {
      renew: `Renewal sent to ${a.who}`,
      approve: `Payment approved · ${a.who}`,
      assign: `Plan picker opened for ${a.who}`,
      expired: `Renewal sent to ${a.who}`,
      payment: `Payment approved · ${a.who}`,
      expiring: `Renewal sent to ${a.who}`,
      noplan: `Plan picker opened for ${a.who}`
    };
    setToast(labels[kind] || kind);
    setActions((prev) => prev.filter((x) => x.id !== a.id));
    setTimeout(() => setToast(null), 2200);
  }
  function dismiss(id) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="o-root o3-root">
      <window.O_Sidebar tab={sideTab} setTab={setSideTab} gym={d.gym} />
      <div className="o-main">
        <window.O_TopBar
          eyebrow={d.gym.name + " · " + d.gym.branch}
          title="Dashboard"
          onToast={setToast}
        />
        <div className="o-content o3-content">
          <O3_Header d={d} onToast={setToast} actions={actions} />

          <div className="o3-grid">
            <div className="o3-grid__left">
              <O3_PrioritiesPanel
                actions={actions}
                filter={filter}
                setFilter={setFilter}
                onAction={action}
                onDismiss={dismiss}
              />
              <div className="o3-grid__row">
                <O3_Notif notifications={d.notifications} />
                <O3_Attendance data={d.attendanceTrend} currency={d.kpis.currency} revenueMTD={d.kpis.revenueMTD} />
              </div>
            </div>

            <div className="o3-grid__right">
              <O3_FloorMap floor={d.floor} total={d.inGymRightNow.length} />
              <O3_LiveRoster inGymNow={d.inGymRightNow} />
              <O3_PTSchedule sessions={d.ptSessions} />
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fm-toast o1-toast">
          <window.MIcons.CheckCircle size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

window.OwnerThree = OwnerThree;
