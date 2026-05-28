// Owner Dashboard — Direction 2: "Tabbed Workspace"
// 5 focused tabs: Today / People / Money / Operations / Insights
// Each tab is uncluttered and content-focused.

const { useState: useStateO2, useMemo: useMemoO2 } = React;

function O2_TabBar({ tab, setTab }) {
  const tabs = [
    { v: "today", label: "Today", icon: <window.MIcons.Home size={14} /> },
    { v: "people", label: "People", icon: <window.MIcons.User size={14} />, badge: 23 },
    { v: "money", label: "Money", icon: <window.MIcons.Trophy size={14} />, badge: 7 },
    { v: "ops", label: "Operations", icon: <window.MIcons.Activity size={14} /> },
    { v: "insights", label: "Insights", icon: <window.MIcons.Chart size={14} /> }
  ];
  return (
    <div className="o2-tabbar">
      {tabs.map((t) => (
        <button
          key={t.v}
          className={`o2-tab ${tab === t.v ? "o2-tab--on" : ""}`}
          onClick={() => setTab(t.v)}
        >
          {t.icon}
          <span>{t.label}</span>
          {t.badge && <span className="o2-tab__badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

// ── TODAY tab ────────────────────────────────────────────────────────────
function O2_Today({ d, onAction, onDismiss, actions, setTab }) {
  const k = d.kpis;
  return (
    <div className="o2-today">
      <div className="o2-today__hero">
        <div className="o2-today__hero-copy">
          <span className="o2-today__eyebrow">{d.todayLabel}</span>
          <h2>Good morning, {d.owner.firstName}.</h2>
          <p>{actions.length} {actions.length === 1 ? "thing needs" : "things need"} your attention.</p>
        </div>
        <div className="o2-today__hero-kpis">
          <button
            className="o2-mini o2-mini--btn o2-mini--danger"
            onClick={() => setTab && setTab("money")}
            title="Open Money tab"
          >
            <span><window.MIcons.Clock size={11} /> Renewals due</span>
            <strong>{k.expiringIn30d + k.expiredOverdue}</strong>
            <em>{k.expiredOverdue} already lapsed</em>
          </button>
          <button
            className="o2-mini o2-mini--btn o2-mini--accent"
            onClick={() => setTab && setTab("people")}
            title="Open People tab"
          >
            <span><window.MIcons.Dumbbell size={11} /> Plans pending</span>
            <strong>{k.noPlanCount}</strong>
            <em>members without a workout</em>
          </button>
          <button
            className="o2-mini o2-mini--btn o2-mini--warn"
            onClick={() => setTab && setTab("money")}
            title="Open Money tab"
          >
            <span><window.MIcons.Trophy size={11} /> Pending payments</span>
            <strong>{k.pendingPayments}</strong>
            <em>awaiting your approval</em>
          </button>
        </div>
      </div>

      <div className="o2-today__grid">
        <section className="o-card o2-actions">
          <div className="o-card__head">
            <h3>
              <span className="o2-pulse" />
              Priorities
              <span className="o2-count">{actions.length}</span>
            </h3>
            <a>All actions →</a>
          </div>
          <div className="o-card__body o-card__body--flush">
            <div className="o2-actions__list">
              {actions.slice(0, 6).map((a) => (
                <O2_ActionRow key={a.id} a={a} onAction={onAction} onDismiss={onDismiss} />
              ))}
              {actions.length > 6 && (
                <button className="o2-actions__more">+ {actions.length - 6} more priorities</button>
              )}
            </div>
          </div>
        </section>

        <div className="o2-today__right">
          <section className="o-card">
            <div className="o-card__head">
              <h3><window.MIcons.Calendar size={14} /> Today's PT</h3>
              <a>Schedule →</a>
            </div>
            <div className="o-card__body o-card__body--flush">
              <ul className="o1-pt">
                {d.ptSessions.slice(0, 4).map((s) => (
                  <li key={s.id} className={`o1-pt__row o1-pt__row--${s.status}`}>
                    <div className="o1-pt__time">{s.time}</div>
                    <div className="o1-pt__body">
                      <strong>{s.member}</strong>
                      <small>{s.focus}</small>
                    </div>
                    <span className={`o1-pt__pill o1-pt__pill--${s.status}`}>
                      {s.status === "completed" ? "Done" : s.status === "in_progress" ? "Live" : "Soon"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="o-card">
            <div className="o-card__head">
              <h3><window.MIcons.Activity size={14} /> Activity</h3>
            </div>
            <div className="o-card__body">
              {d.notifications.slice(0, 4).map((n) => {
                const verbFor = {
                  joined: "joined the gym",
                  payment: "submitted a payment",
                  session_done: "completed a session",
                  pr: "hit a new PR",
                  expiring: "membership expiring soon",
                  feedback: "left feedback"
                };
                return (
                  <div key={n.id} className="o-notif">
                    <div className="o-notif__icon">
                      <window.MIcons.User size={12} />
                    </div>
                    <div className="o-notif__body">
                      <strong>{n.who}</strong> {n.note || verbFor[n.kind]}
                      <small>{n.at}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function O2_ActionRow({ a, onAction, onDismiss }) {
  const cfg = {
    expired: { icon: <window.MIcons.X size={14} />, label: "Expired" },
    payment: { icon: <window.MIcons.Trophy size={14} />, label: "Pending" },
    expiring: { icon: <window.MIcons.Clock size={14} />, label: "Expiring" },
    noplan: { icon: <window.MIcons.Dumbbell size={14} />, label: "No plan" }
  }[a.kind];
  const primary = {
    expired: "Renew",
    payment: "Approve",
    expiring: "Send renewal",
    noplan: "Assign"
  }[a.kind];
  return (
    <div className={`o2-action o2-action--${a.kind}`}>
      <div className="o2-action__icon">{cfg.icon}</div>
      <div className="o2-action__body">
        <strong>{a.who}</strong>
        <small>{cfg.label} · {a.subtitle}</small>
      </div>
      <button className="fm-btn fm-btn--subtle fm-btn--sm" onClick={() => onAction(a.kind, a)}>
        {primary}
      </button>
    </div>
  );
}

// ── PEOPLE tab ───────────────────────────────────────────────────────────
function O2_People({ d, actions, onAction }) {
  const noPlan = actions.filter((a) => a.kind === "noplan");
  const recent = d.notifications.filter((n) => n.kind === "joined");

  return (
    <div className="o2-tab-page">
      <div className="o2-tab-grid">
        <section className="o-card">
          <div className="o-card__head">
            <h3>
              <window.MIcons.Dumbbell size={14} /> Members without a plan
              <span className="o2-count">{noPlan.length}</span>
            </h3>
            <a>Open members →</a>
          </div>
          <div className="o-card__body">
            <div className="o2-people__list">
              {noPlan.map((a) => (
                <div key={a.id} className="o2-person">
                  <span className="fm-avatar fm-avatar--md">{a.who.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                  <div className="o2-person__body">
                    <strong>{a.who}</strong>
                    <small>{a.subtitle}</small>
                  </div>
                  <button className="fm-btn fm-btn--subtle fm-btn--sm" onClick={() => onAction("assign", a)}>
                    Assign plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3><window.MIcons.User size={14} /> Recent joins</h3>
          </div>
          <div className="o-card__body">
            {recent.map((n) => (
              <div key={n.id} className="o-notif">
                <div className="o-notif__icon"><window.MIcons.User size={12} /></div>
                <div className="o-notif__body">
                  <strong>{n.who}</strong> joined the gym
                  <small>{n.at}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3><window.MIcons.Heart size={14} /> Member breakdown</h3>
          </div>
          <div className="o-card__body">
            <div className="o2-bd">
              <div className="o2-bd__row">
                <strong>{d.kpis.totalMembers}</strong>
                <span>Total members</span>
              </div>
              <div className="o2-bd__row">
                <strong>{d.kpis.activeMembers}</strong>
                <span>Active</span>
                <em className="o2-bd__pill o2-bd__pill--brand">{Math.round((d.kpis.activeMembers / d.kpis.totalMembers) * 100)}%</em>
              </div>
              <div className="o2-bd__row">
                <strong>{d.kpis.totalMembers - d.kpis.activeMembers}</strong>
                <span>Inactive · paused</span>
                <em className="o2-bd__pill">{Math.round(((d.kpis.totalMembers - d.kpis.activeMembers) / d.kpis.totalMembers) * 100)}%</em>
              </div>
              <div className="o2-bd__row">
                <strong>{d.kpis.newJoinsThisWeek}</strong>
                <span>New this week</span>
                <em className="o2-bd__pill o2-bd__pill--brand">↑</em>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── MONEY tab ────────────────────────────────────────────────────────────
function O2_Money({ d, actions, onAction }) {
  const k = d.kpis;
  const payments = actions.filter((a) => a.kind === "payment");
  const expiring = actions.filter((a) => a.kind === "expiring" || a.kind === "expired");
  const monthlyTrend = [320, 345, 360, 358, 370, 389, 432];
  const max = Math.max(...monthlyTrend);

  return (
    <div className="o2-tab-page">
      <div className="o2-money-kpis">
        <div className="o-kpi o-kpi--brand">
          <span className="o-kpi__label">Revenue MTD</span>
          <span className="o-kpi__value">{k.currency}{(k.revenueMTD / 1000).toFixed(1)}<small>k</small></span>
          <span className="o-kpi__sub o-kpi__sub--good">+{Math.round(((k.revenueMTD - k.revenueLastMonth) / k.revenueLastMonth) * 100)}% vs last month</span>
        </div>
        <div className="o-kpi o-kpi--warn">
          <span className="o-kpi__label">Pending payments</span>
          <span className="o-kpi__value">{k.pendingPayments}</span>
          <span className="o-kpi__sub">{k.currency}{payments.reduce((s, p) => s + (p.value || 0), 0).toLocaleString("en-IN")} waiting</span>
        </div>
        <div className="o-kpi o-kpi--danger">
          <span className="o-kpi__label">Expiring · 30 days</span>
          <span className="o-kpi__value">{k.expiringIn30d}</span>
          <span className="o-kpi__sub o-kpi__sub--bad">{k.expiredOverdue} already lapsed</span>
        </div>
        <div className="o-kpi o-kpi--neutral">
          <span className="o-kpi__label">Avg. revenue / member</span>
          <span className="o-kpi__value">{k.currency}{Math.round(k.revenueMTD / k.activeMembers).toLocaleString("en-IN")}</span>
          <span className="o-kpi__sub">monthly</span>
        </div>
      </div>

      <div className="o2-tab-grid">
        <section className="o-card o2-trend">
          <div className="o-card__head">
            <h3><window.MIcons.TrendUp size={14} /> Revenue · last 7 months</h3>
            <a>Reports →</a>
          </div>
          <div className="o-card__body">
            <div className="o2-trend__bars">
              {monthlyTrend.map((v, i) => {
                const h = (v / max) * 100;
                const isCurrent = i === monthlyTrend.length - 1;
                return (
                  <div key={i} className="o2-trend__bar">
                    <div className={`o2-trend__fill ${isCurrent ? "o2-trend__fill--current" : ""}`} style={{ height: `${h}%` }}>
                      <span>{k.currency}{v}k</span>
                    </div>
                    <small>{["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"][i]}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3>
              <window.MIcons.Trophy size={14} /> Pending payments
              <span className="o2-count">{payments.length}</span>
            </h3>
            <a>Open billing →</a>
          </div>
          <div className="o-card__body o-card__body--flush">
            <div className="o2-actions__list">
              {payments.map((a) => (
                <O2_ActionRow key={a.id} a={a} onAction={onAction} />
              ))}
            </div>
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3>
              <window.MIcons.Clock size={14} /> Expiring & expired
              <span className="o2-count">{expiring.length}</span>
            </h3>
            <a>Send renewals →</a>
          </div>
          <div className="o-card__body o-card__body--flush">
            <div className="o2-actions__list">
              {expiring.map((a) => (
                <O2_ActionRow key={a.id} a={a} onAction={onAction} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── OPS tab ──────────────────────────────────────────────────────────────
function O2_Ops({ d }) {
  return (
    <div className="o2-tab-page">
      <div className="o2-tab-grid">
        <section className="o-card o2-ops-floor">
          <div className="o-card__head">
            <h3>
              <span className="o1-live__pulse" />
              Floor occupancy
              <span className="o1-live__count">{d.inGymRightNow.length} in gym</span>
            </h3>
            <a>Live map →</a>
          </div>
          <div className="o-card__body">
            <div className="o1-zones">
              {d.floor.map((z) => {
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
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3><window.MIcons.User size={14} /> Who's training</h3>
          </div>
          <div className="o-card__body">
            <div className="o2-roster">
              {d.inGymRightNow.map((m) => (
                <div key={m.id} className="o2-roster__row">
                  <span className="fm-avatar fm-avatar--md">{m.initials}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <small>{m.trainer ? `w/ ${m.trainer} · ` : ""}{m.since} min</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="o-card o2-pt-full">
          <div className="o-card__head">
            <h3><window.MIcons.Calendar size={14} /> Today's PT sessions</h3>
          </div>
          <div className="o-card__body o-card__body--flush">
            <ul className="o1-pt">
              {d.ptSessions.map((s) => (
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
      </div>
    </div>
  );
}

// ── INSIGHTS tab ─────────────────────────────────────────────────────────
function O2_Insights({ d }) {
  const max = Math.max(...d.attendanceTrend);
  const total = d.membershipMix.reduce((s, m) => s + m.count, 0);
  return (
    <div className="o2-tab-page">
      <div className="o2-tab-grid">
        <section className="o-card o2-trend">
          <div className="o-card__head">
            <h3><window.MIcons.Chart size={14} /> Attendance — last 14 days</h3>
          </div>
          <div className="o-card__body">
            <div className="o1-bars">
              {d.attendanceTrend.map((v, i) => {
                const h = (v / max) * 100;
                const isToday = i === d.attendanceTrend.length - 1;
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

        <section className="o-card">
          <div className="o-card__head">
            <h3><window.MIcons.Heart size={14} /> Membership mix</h3>
            <a>Plans →</a>
          </div>
          <div className="o-card__body">
            <div className="o2-mix-bar">
              {d.membershipMix.map((m) => (
                <div
                  key={m.plan}
                  className="o2-mix-bar__seg"
                  style={{ flex: m.count, background: m.color }}
                  title={`${m.plan}: ${m.count}`}
                />
              ))}
            </div>
            <div className="o2-mix-legend">
              {d.membershipMix.map((m) => (
                <div key={m.plan} className="o2-mix-row">
                  <span className="o2-mix-row__dot" style={{ background: m.color }} />
                  <span className="o2-mix-row__label">{m.plan}</span>
                  <strong>{m.count}</strong>
                  <small>{Math.round((m.count / total) * 100)}%</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="o-card">
          <div className="o-card__head">
            <h3><window.MIcons.Sparkle size={14} /> Quick stats</h3>
          </div>
          <div className="o-card__body">
            <div className="o2-quick">
              <div>
                <span>Avg. sessions / week</span>
                <strong>3.2</strong>
              </div>
              <div>
                <span>Member retention</span>
                <strong>84%</strong>
              </div>
              <div>
                <span>PT utilization</span>
                <strong>72%</strong>
              </div>
              <div>
                <span>Avg. lifetime value</span>
                <strong>{d.kpis.currency}28.4k</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────
function OwnerTwo() {
  const d = window.MOCK_OWNER;
  const [tab, setTab] = useStateO2("today");
  const [actions, setActions] = useStateO2(d.actions);
  const [toast, setToast] = useStateO2(null);
  const [sideTab, setSideTab] = useStateO2("dashboard");

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
    <div className="o-root">
      <window.O_Sidebar tab={sideTab} setTab={setSideTab} gym={d.gym} />
      <div className="o-main">
        <window.O_TopBar
          eyebrow={d.gym.name}
          title="Dashboard"
          onToast={setToast}
        />
        <O2_TabBar tab={tab} setTab={setTab} />

        <div className="o-content">
          {tab === "today" && <O2_Today d={d} actions={actions} onAction={action} onDismiss={dismiss} setTab={setTab} />}
          {tab === "people" && <O2_People d={d} actions={actions} onAction={action} />}
          {tab === "money" && <O2_Money d={d} actions={actions} onAction={action} />}
          {tab === "ops" && <O2_Ops d={d} />}
          {tab === "insights" && <O2_Insights d={d} />}
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

window.OwnerTwo = OwnerTwo;
