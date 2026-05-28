// Owner Dashboard — Direction 1: "Action Hub"
// Single-page, no tabs. Everything consolidated.
// Hero = unified action queue. KPI strip at top. Live state below.

const { useState: useStateO1, useMemo: useMemoO1 } = React;

function O1_KpiStrip({ k }) {
  const items = [
    { key: "total", label: "Total members", value: k.totalMembers, sub: `+${k.newJoinsThisWeek} this week`, tone: "neutral", subGood: true },
    { key: "ingym", label: "In gym now", value: k.inGymNow, sub: `${Math.round((k.inGymNow / k.capacity) * 100)}% of capacity`, tone: "brand" },
    { key: "actions", label: "Needs attention", value: k.noPlanCount + k.pendingPayments + k.expiringIn30d + k.expiredOverdue, sub: `${k.expiredOverdue} expired · ${k.pendingPayments} payments`, tone: "danger" },
    { key: "revenue", label: "Revenue MTD", value: `${k.currency}${(k.revenueMTD / 1000).toFixed(1)}k`, sub: `+${Math.round(((k.revenueMTD - k.revenueLastMonth) / k.revenueLastMonth) * 100)}% vs last month`, tone: "warn", subGood: true }
  ];
  return (
    <div className="o1-kpis">
      {items.map((it) => (
        <button key={it.key} className={`o-kpi o-kpi--${it.tone}`}>
          <span className="o-kpi__label">{it.label}</span>
          <span className="o-kpi__value">{it.value}</span>
          <span className={`o-kpi__sub ${it.subGood ? "o-kpi__sub--good" : ""}`}>{it.sub}</span>
        </button>
      ))}
    </div>
  );
}

function O1_ActionQueue({ actions, onAction, onDismiss, filter, setFilter }) {
  const filtered = filter === "all" ? actions : actions.filter((a) => a.kind === filter);

  const counts = {
    expired: actions.filter((a) => a.kind === "expired").length,
    payment: actions.filter((a) => a.kind === "payment").length,
    expiring: actions.filter((a) => a.kind === "expiring").length,
    noplan: actions.filter((a) => a.kind === "noplan").length
  };

  const filters = [
    { v: "all", l: "Everything", c: actions.length },
    { v: "expired", l: "Expired", c: counts.expired, tone: "danger" },
    { v: "payment", l: "Pending payments", c: counts.payment, tone: "warn" },
    { v: "expiring", l: "Expiring", c: counts.expiring, tone: "warning" },
    { v: "noplan", l: "No plan", c: counts.noplan, tone: "accent" }
  ];

  return (
    <section className="o1-queue">
      <div className="o1-queue__head">
        <div>
          <h2 className="o1-queue__title">
            <span className="o1-queue__pulse" />
            Action queue
            <span className="o1-queue__total">{actions.length}</span>
          </h2>
          <p className="o1-queue__sub">Members waiting on you, sorted by urgency. Address one and it disappears.</p>
        </div>
      </div>

      <div className="o1-queue__filters">
        {filters.map((f) => (
          <button
            key={f.v}
            className={`o1-chip ${filter === f.v ? "o1-chip--on" : ""} ${f.tone ? `o1-chip--${f.tone}` : ""}`}
            onClick={() => setFilter(f.v)}
          >
            {f.l}
            <span className="o1-chip__c">{f.c}</span>
          </button>
        ))}
      </div>

      <div className="o1-queue__list">
        {filtered.length === 0 ? (
          <div className="o1-empty">
            <div className="o1-empty__icon"><window.MIcons.Trophy size={24} /></div>
            <strong>All clear.</strong>
            <p>No items in this filter. Nice work.</p>
          </div>
        ) : filtered.map((a) => (
          <ActionRow key={a.id} a={a} onAction={onAction} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  );
}

function ActionRow({ a, onAction, onDismiss }) {
  const cfg = {
    expired: { icon: <window.MIcons.X size={15} />, tag: "Expired", primary: "Renew", primaryAct: "renew" },
    payment: { icon: <window.MIcons.Trophy size={15} />, tag: "Pending payment", primary: "Approve", primaryAct: "approve" },
    expiring: { icon: <window.MIcons.Clock size={15} />, tag: "Expiring", primary: "Send renewal", primaryAct: "renew" },
    noplan: { icon: <window.MIcons.Dumbbell size={15} />, tag: "No plan", primary: "Assign plan", primaryAct: "assign" }
  }[a.kind];

  const money = a.value ? `${window.MOCK_OWNER.kpis.currency}${a.value.toLocaleString("en-IN")}` : null;

  return (
    <div className={`o-action o-action--${a.kind}`}>
      <div className="o-action__icon">{cfg.icon}</div>
      <div className="o-action__body">
        <div className="o-action__who">
          {a.who}
          <span className="o-action__tag">{cfg.tag}</span>
        </div>
        <div className="o-action__sub">@{a.whoId} · {a.subtitle}</div>
      </div>
      {money && <div className="o1-money">{money}</div>}
      <div className="o-action__cta">
        <button
          className="fm-btn fm-btn--primary fm-btn--sm"
          onClick={() => onAction(cfg.primaryAct, a)}
        >
          {cfg.primary}
        </button>
        <button
          className="o-action__dismiss"
          onClick={() => onDismiss(a.id)}
          aria-label="Snooze"
          title="Snooze for later"
        >
          <window.MIcons.X size={12} />
        </button>
      </div>
    </div>
  );
}

function O1_LiveFloor({ floor, inGymNow, total }) {
  const occupancy = inGymNow.length;
  return (
    <section className="o-card o1-live">
      <div className="o-card__head">
        <h3>
          <span className="o1-live__pulse" />
          Right now
          <span className="o1-live__count">{occupancy} in gym</span>
        </h3>
        <a>Floor map →</a>
      </div>
      <div className="o-card__body">
        <div className="o1-zones">
          {floor.map((z) => {
            const pct = Math.round((z.current / z.capacity) * 100);
            return (
              <div key={z.zone} className="o1-zone">
                <div className="o1-zone__head">
                  <span>{z.zone}</span>
                  <strong>{z.current}<small> / {z.capacity}</small></strong>
                </div>
                <div className="o1-zone__bar">
                  <div
                    className={`o1-zone__fill ${pct > 80 ? "o1-zone__fill--hot" : pct > 50 ? "o1-zone__fill--med" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="o1-roster">
          <div className="o1-roster__label">Who's training</div>
          <div className="o1-roster__list">
            {inGymNow.slice(0, 6).map((m) => (
              <div key={m.id} className="o1-roster__row">
                <span className="fm-avatar fm-avatar--sm">{m.initials}</span>
                <div>
                  <strong>{m.name}</strong>
                  <small>{m.trainer ? `w/ ${m.trainer} · ` : ""}{m.since} min</small>
                </div>
              </div>
            ))}
            {inGymNow.length > 6 && (
              <div className="o1-roster__more">+{inGymNow.length - 6} more</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function O1_PTToday({ sessions }) {
  return (
    <section className="o-card">
      <div className="o-card__head">
        <h3><window.MIcons.Calendar size={14} /> Today's PT sessions</h3>
        <a>Schedule →</a>
      </div>
      <div className="o-card__body o-card__body--flush">
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

function O1_Activity({ notifications }) {
  const iconFor = {
    joined: <window.MIcons.User size={14} />,
    payment: <window.MIcons.Trophy size={14} />,
    session_done: <window.MIcons.CheckCircle size={14} />,
    pr: <window.MIcons.Sparkle size={14} />,
    expiring: <window.MIcons.Clock size={14} />,
    feedback: <window.MIcons.Heart size={14} />
  };
  const verbFor = {
    joined: "joined the gym",
    payment: "submitted a payment",
    session_done: "completed a session",
    pr: "hit a new PR",
    expiring: "membership expiring soon",
    feedback: "left feedback"
  };
  return (
    <section className="o-card">
      <div className="o-card__head">
        <h3><window.MIcons.Activity size={14} /> Activity</h3>
        <a>All →</a>
      </div>
      <div className="o-card__body">
        {notifications.map((n) => (
          <div key={n.id} className="o-notif">
            <div className="o-notif__icon">{iconFor[n.kind]}</div>
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

function O1_AttendanceTrend({ data }) {
  const max = Math.max(...data);
  return (
    <section className="o-card">
      <div className="o-card__head">
        <h3><window.MIcons.Chart size={14} /> Attendance — last 14 days</h3>
        <a>Details →</a>
      </div>
      <div className="o-card__body">
        <div className="o1-bars">
          {data.map((v, i) => {
            const h = (v / max) * 100;
            const isToday = i === data.length - 1;
            return (
              <div key={i} className="o1-bar">
                <div className={`o1-bar__fill ${isToday ? "o1-bar__fill--today" : ""}`} style={{ height: `${h}%` }}>
                  <span>{v}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="o1-bars-axis">
          <span>2 weeks ago</span>
          <span>today</span>
        </div>
      </div>
    </section>
  );
}

function OwnerOne() {
  const d = window.MOCK_OWNER;
  const [actions, setActions] = useStateO1(d.actions);
  const [filter, setFilter] = useStateO1("all");
  const [toast, setToast] = useStateO1(null);
  const [sideTab, setSideTab] = useStateO1("dashboard");

  function action(act, a) {
    const labels = {
      renew: `Renewal link sent to ${a.who}`,
      approve: `Payment approved · ${a.who}`,
      assign: `Plan picker opened for ${a.who}`
    };
    setToast(labels[act] || act);
    setActions((prev) => prev.filter((x) => x.id !== a.id));
    setTimeout(() => setToast(null), 2200);
  }
  function dismiss(id) {
    setActions((prev) => prev.filter((a) => a.id !== id));
    setToast("Snoozed for later");
    setTimeout(() => setToast(null), 1500);
  }

  return (
    <div className="o-root">
      <window.O_Sidebar tab={sideTab} setTab={setSideTab} gym={d.gym} />
      <div className="o-main">
        <window.O_TopBar
          eyebrow={d.todayLabel}
          title="Dashboard"
          onToast={setToast}
        />

        <div className="o-content">
          <div className="o1-greet">
            <h2>Good morning, {d.owner.firstName}.</h2>
            <span>{actions.length} {actions.length === 1 ? "thing needs" : "things need"} your attention. The gym is running smoothly otherwise.</span>
          </div>

          <O1_KpiStrip k={d.kpis} />

          <div className="o1-grid">
            <div className="o1-grid__left">
              <O1_ActionQueue
                actions={actions}
                onAction={action}
                onDismiss={dismiss}
                filter={filter}
                setFilter={setFilter}
              />
              <O1_LiveFloor
                floor={d.floor}
                inGymNow={d.inGymRightNow}
                total={d.kpis.capacity}
              />
              <O1_AttendanceTrend data={d.attendanceTrend} />
            </div>
            <div className="o1-grid__right">
              <O1_PTToday sessions={d.ptSessions} />
              <O1_Activity notifications={d.notifications} />
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

window.OwnerOne = OwnerOne;
