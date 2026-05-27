// Direction 3 — Reimagined: triage-first ("what needs my attention today").
// Top: an Action Queue of members needing renewal / plan assignment.
// Below: a calmer compact directory of everyone else.

const { useState: useState3, useMemo: useMemo3 } = React;

function avatarColor3(id) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return `fs-avatar--c${(n % 6) + 1}`;
}

// ── Action queue card ───────────────────────────────────────────────────
function QueueCard({ m, type, onAction, onDismiss }) {
  const config = {
    expired: {
      tone: "danger",
      icon: <window.Icons.AlertTriangle size={14} />,
      label: "Membership expired",
      sub: `${Math.abs(m.daysToExpiry)} days ago · ${m.currentPackageName}`,
      primary: { label: "Renew now", icon: <window.Icons.Repeat size={14} />, action: "renew" },
      secondary: { label: "Message", icon: <window.Icons.Mail size={14} />, action: "message" }
    },
    expiring: {
      tone: "warn",
      icon: <window.Icons.Calendar size={14} />,
      label: "Expires soon",
      sub: `in ${m.daysToExpiry} days · ${m.currentPackageName}`,
      primary: { label: "Send renewal", icon: <window.Icons.Repeat size={14} />, action: "renew" },
      secondary: { label: "Message", icon: <window.Icons.Mail size={14} />, action: "message" }
    },
    noplan: {
      tone: "accent",
      icon: <window.Icons.Dumbbell size={14} />,
      label: "No workout plan",
      sub: `Goal: ${m.goal}${m.assignedTrainer ? ` · ${m.assignedTrainer}` : ""}`,
      primary: { label: "Assign plan", icon: <window.Icons.Sparkle size={14} />, action: "assign" },
      secondary: { label: "Open", icon: <window.Icons.ChevRight size={14} />, action: "open" }
    }
  }[type];

  return (
    <div className={`d3-q d3-q--${config.tone}`}>
      <div className="d3-q__top">
        <div className="d3-q__who">
          <span className={`fs-avatar fs-avatar--md ${avatarColor3(m.id)}`}>
            {m.avatarInitials}
          </span>
          <div>
            <div className="d3-q__name">{m.fullName}</div>
            <div className="d3-q__handle">@{m.username}</div>
          </div>
        </div>
        <button
          className="d3-q__dismiss"
          onClick={() => onDismiss(m.id)}
          aria-label="Dismiss"
          title="Snooze for now"
        >
          <window.Icons.X size={12} />
        </button>
      </div>
      <div className="d3-q__reason">
        <span className={`d3-q__tag d3-q__tag--${config.tone}`}>
          {config.icon} {config.label}
        </span>
        <span className="d3-q__sub">{config.sub}</span>
      </div>
      <div className="d3-q__actions">
        <button
          className={`fs-btn fs-btn--brand fs-btn--sm`}
          onClick={() => onAction(config.primary.action, m)}
        >
          {config.primary.icon} {config.primary.label}
        </button>
        <button
          className="fs-btn fs-btn--ghost fs-btn--sm"
          onClick={() => onAction(config.secondary.action, m)}
        >
          {config.secondary.icon} {config.secondary.label}
        </button>
      </div>
    </div>
  );
}

// ── Directory row ──────────────────────────────────────────────────────
function DirRow({ m, sel, onSel }) {
  return (
    <div
      className={`d3-row ${sel ? "d3-row--sel" : ""} ${!m.isActive ? "d3-row--suspended" : ""}`}
      onClick={() => onSel(m.id)}
    >
      <div className="d3-row__check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="fs-check"
          checked={sel}
          onChange={() => onSel(m.id)}
          aria-label={`Select ${m.fullName}`}
        />
      </div>
      <span className={`fs-avatar fs-avatar--sm ${avatarColor3(m.id)}`}>
        {m.avatarInitials}
        <span className={`fs-avatar__dot fs-avatar__dot--${m.isActive ? "active" : "suspended"}`} />
      </span>
      <div className="d3-row__name">
        <a onClick={(e) => e.stopPropagation()}>{m.fullName}</a>
        <span className="d3-row__handle">@{m.username}</span>
      </div>
      <div className="d3-row__plan">
        {m.hasPlan ? (
          <>
            <span>{m.program}</span>
            {m.assignedTrainer && <span className="d3-row__plan-sub">w/ {m.assignedTrainer}</span>}
          </>
        ) : (
          <span className="d3-row__plan-none">No plan</span>
        )}
      </div>
      <div className="d3-row__mem">
        <span className="d3-row__pkg">{m.currentPackageName}</span>
        <span className="d3-row__exp">
          {m.membershipStatus === "expired"
            ? `Expired ${window.fmtDateShort(m.membershipEndDate)}`
            : `Renews ${window.fmtDateShort(m.membershipEndDate)}`}
        </span>
      </div>
      <div className="d3-row__joined">{window.fmtDateShort(m.joinedAt)}</div>
      <button
        className="fs-btn fs-btn--ghost fs-btn--icon d3-row__open"
        onClick={(e) => e.stopPropagation()}
        title="Open profile"
      >
        <window.Icons.ChevRight size={14} />
      </button>
    </div>
  );
}

function DirectionThree() {
  const all = window.MOCK_MEMBERS;

  const [query, setQuery] = useState3("");
  const [dismissed, setDismissed] = useState3(new Set());
  const [tab, setTab] = useState3("all"); // all / active / suspended
  const [sortKey, setSortKey] = useState3("name");
  const [selected, setSelected] = useState3(new Set());
  const [toast, setToast] = useState3(null);

  const stats = useMemo3(() => ({
    total: all.length,
    active: all.filter((m) => m.isActive).length,
    suspended: all.filter((m) => !m.isActive).length,
    expired: all.filter((m) => m.membershipStatus === "expired").length,
    expiring: all.filter((m) => m.membershipStatus === "expiring_soon").length,
    noPlan: all.filter((m) => !m.hasPlan).length
  }), [all]);

  // Build the action queue, deduped by member (highest-priority issue wins)
  const queue = useMemo3(() => {
    const items = [];
    const claimed = new Set();
    for (const m of all) {
      if (dismissed.has(m.id)) continue;
      if (m.membershipStatus === "expired" && !claimed.has(m.id)) {
        items.push({ m, type: "expired", priority: 3 });
        claimed.add(m.id);
      } else if (m.membershipStatus === "expiring_soon" && !claimed.has(m.id)) {
        items.push({ m, type: "expiring", priority: 2 });
        claimed.add(m.id);
      } else if (!m.hasPlan && !claimed.has(m.id)) {
        items.push({ m, type: "noplan", priority: 1 });
        claimed.add(m.id);
      }
    }
    return items.sort((a, b) => b.priority - a.priority);
  }, [all, dismissed]);

  const filtered = useMemo3(() => {
    let list = all;
    if (tab === "active") list = list.filter((m) => m.isActive);
    if (tab === "suspended") list = list.filter((m) => !m.isActive);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q)
      );
    const cmp = {
      name: (a, b) => a.fullName.localeCompare(b.fullName),
      newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      expiry: (a, b) => a.daysToExpiry - b.daysToExpiry
    }[sortKey];
    return [...list].sort(cmp);
  }, [all, tab, query, sortKey]);

  function dismiss(id) {
    setDismissed((prev) => new Set([...prev, id]));
  }
  function singleAction(action, m) {
    const labels = {
      renew: `Renewal sent to ${m.fullName}`,
      message: `Composing message to ${m.fullName}`,
      assign: `Plan assignment opened for ${m.fullName}`,
      open: `Opening ${m.fullName}'s profile`
    };
    setToast(labels[action]);
    setTimeout(() => setToast(null), 2000);
    if (action === "renew" || action === "assign") {
      setDismissed((prev) => new Set([...prev, m.id]));
    }
  }
  function toggleSel(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function bulkRun(action) {
    const n = selected.size;
    setToast(`${action[0].toUpperCase() + action.slice(1)} action sent to ${n}`);
    setSelected(new Set());
    setTimeout(() => setToast(null), 2000);
  }
  function clearAll() {
    setDismissed(new Set(all.map((m) => m.id))); // dismiss everything
    setToast("Queue cleared. Great work.");
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="fs-page d3-page">
      <div className="d3-wrap">
        {/* Header */}
        <header className="d3-header">
          <div>
            <div className="fs-breadcrumb">
              <a>Dashboard</a>
              <span className="fs-breadcrumb__sep">/</span>
              <span>Members</span>
            </div>
            <h1 className="fs-h1">
              <span className="d3-greet">Good morning, Priya.</span>
            </h1>
            <p className="fs-page-desc">
              {queue.length > 0
                ? <><strong>{queue.length}</strong> {queue.length === 1 ? "member needs" : "members need"} a quick action. The rest are all good.</>
                : <>Your queue is empty. {stats.total} members are all on track.</>}
            </p>
          </div>
          <div className="d3-header__actions">
            <button className="fs-btn fs-btn--ghost">
              <window.Icons.Download size={15} /> Export
            </button>
            <button className="fs-btn fs-btn--brand">
              <window.Icons.Plus size={15} /> Add member
            </button>
          </div>
        </header>

        {/* ── Action queue ─────────────────────────────────────────────── */}
        <section className="d3-queue-section">
          <div className="d3-queue-section__head">
            <div>
              <h2 className="d3-section-title">
                <span className="d3-section-title__pulse" />
                Action queue
                <span className="d3-section-title__count">{queue.length}</span>
              </h2>
              <p className="d3-section-sub">
                Sorted by urgency. Acting clears the card. Dismiss to handle later.
              </p>
            </div>
            <div className="d3-queue-section__legend">
              <span className="d3-legend-dot d3-legend-dot--danger" />
              <span>{stats.expired} expired</span>
              <span className="d3-legend-dot d3-legend-dot--warn" />
              <span>{stats.expiring} expiring</span>
              <span className="d3-legend-dot d3-legend-dot--accent" />
              <span>{stats.noPlan} no plan</span>
            </div>
          </div>

          {queue.length > 0 ? (
            <div className="d3-queue fs-scroll">
              {queue.map(({ m, type }) => (
                <QueueCard
                  key={m.id}
                  m={m}
                  type={type}
                  onAction={singleAction}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          ) : (
            <div className="d3-queue-empty">
              <div className="d3-queue-empty__icon">
                <window.Icons.Trophy size={28} />
              </div>
              <div>
                <strong>All clear.</strong>
                <p>No renewals due, no plans missing. Check back tomorrow.</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Directory ─────────────────────────────────────────────────── */}
        <section className="d3-dir fs-surface">
          <div className="d3-dir__head">
            <div className="d3-dir__head-left">
              <h2 className="d3-section-title">
                Directory
                <span className="d3-section-title__count d3-section-title__count--muted">{stats.total}</span>
              </h2>
            </div>
            <div className="d3-dir__head-right">
              <label className="d3-search">
                <window.Icons.Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                />
              </label>
              <div className="d3-tabs">
                {[
                  { v: "all", l: `All ${stats.total}` },
                  { v: "active", l: `Active ${stats.active}` },
                  { v: "suspended", l: `Suspended ${stats.suspended}` }
                ].map((t) => (
                  <button
                    key={t.v}
                    className={`d3-tab ${tab === t.v ? "d3-tab--on" : ""}`}
                    onClick={() => setTab(t.v)}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
              <select
                className="fs-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="name">A–Z</option>
                <option value="newest">Newest</option>
                <option value="expiry">Expiring</option>
              </select>
            </div>
          </div>

          <div className="d3-dir__header-row">
            <span />
            <span />
            <span>Member</span>
            <span>Plan</span>
            <span>Membership</span>
            <span>Joined</span>
            <span />
          </div>

          <div className="d3-dir__list fs-scroll">
            {filtered.slice(0, 12).map((m) => (
              <DirRow key={m.id} m={m} sel={selected.has(m.id)} onSel={toggleSel} />
            ))}
            {filtered.length === 0 && (
              <div className="d3-dir__empty">
                <window.Icons.Inbox size={28} />
                <p>No matches.</p>
              </div>
            )}
          </div>

          {filtered.length > 12 && (
            <div className="d3-dir__foot">
              Showing 12 of {filtered.length}.{" "}
              <a className="d3-dir__more">Show all →</a>
            </div>
          )}
        </section>
      </div>

      {/* Floating bulk bar (matches the rest) */}
      {selected.size > 0 && (
        <div className="d3-bulk">
          <span className="d3-bulk__count">{selected.size} selected</span>
          <div className="d3-bulk__actions">
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("assign")}>
              <window.Icons.Dumbbell size={14} /> Assign program
            </button>
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("message")}>
              <window.Icons.Mail size={14} /> Message
            </button>
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("renew")}>
              <window.Icons.Repeat size={14} /> Renew
            </button>
            <button className="fs-btn fs-btn--danger fs-btn--sm" onClick={() => bulkRun("suspend")}>
              <window.Icons.Pause size={14} /> Suspend
            </button>
          </div>
          <button className="fs-btn fs-btn--ghost fs-btn--icon" onClick={() => setSelected(new Set())}>
            <window.Icons.X size={14} />
          </button>
        </div>
      )}

      {toast && (
        <div className="fs-toast"><window.Icons.Check size={15} /> {toast}</div>
      )}
    </div>
  );
}

window.DirectionThree = DirectionThree;
