// Direction 4 — Hybrid: action queue (from D3) + refined table (from D1)
// Top: scrollable action queue surfacing renewal/plan urgencies
// Below: KPI strip → search/sort toolbar → calm table → dark bulk dock

const { useState: useState4, useMemo: useMemo4, useEffect: useEffect4, useRef: useRef4 } = React;

function ac4(id) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return `fs-avatar--c${(n % 6) + 1}`;
}

// ── Action queue card (mirrors D3) ─────────────────────────────────────
function QCard({ m, type, onAction, onDismiss }) {
  const config = {
    expired: {
      tone: "danger",
      icon: <window.Icons.AlertTriangle size={14} />,
      label: "Expired",
      sub: `${Math.abs(m.daysToExpiry)}d ago · ${m.currentPackageName}`,
      primary: { l: "Renew", icon: <window.Icons.Repeat size={13} />, a: "renew" }
    },
    expiring: {
      tone: "warn",
      icon: <window.Icons.Calendar size={14} />,
      label: "Expiring",
      sub: `in ${m.daysToExpiry}d · ${m.currentPackageName}`,
      primary: { l: "Send renewal", icon: <window.Icons.Repeat size={13} />, a: "renew" }
    },
    noplan: {
      tone: "accent",
      icon: <window.Icons.Dumbbell size={14} />,
      label: "No plan",
      sub: `Goal: ${m.goal}`,
      primary: { l: "Assign plan", icon: <window.Icons.Sparkle size={13} />, a: "assign" }
    }
  }[type];

  return (
    <div className={`d4-q d4-q--${config.tone}`}>
      <div className="d4-q__top">
        <span className={`fs-avatar fs-avatar--md ${ac4(m.id)}`}>{m.avatarInitials}</span>
        <div className="d4-q__id">
          <div className="d4-q__name">{m.fullName}</div>
          <div className="d4-q__handle">@{m.username}</div>
        </div>
        <button className="d4-q__dismiss" onClick={() => onDismiss(m.id)} aria-label="Dismiss" title="Snooze for now">
          <window.Icons.X size={12} />
        </button>
      </div>
      <div className="d4-q__reason">
        <span className={`d4-q__tag d4-q__tag--${config.tone}`}>
          {config.icon} {config.label}
        </span>
        <span className="d4-q__sub">{config.sub}</span>
      </div>
      <button
        className="d4-q__action"
        onClick={() => onAction(config.primary.a, m)}
      >
        {config.primary.icon} {config.primary.l}
      </button>
    </div>
  );
}

// ── Membership cell (mirrors D1) ───────────────────────────────────────
function MCell({ m }) {
  const tone =
    m.membershipStatus === "expired" ? "danger"
    : m.membershipStatus === "expiring_soon" ? "warn"
    : "brand";
  const label =
    m.membershipStatus === "expired" ? "Expired"
    : m.membershipStatus === "expiring_soon" ? "Expiring"
    : "Active";
  const sub =
    m.membershipStatus === "expired" ? `${Math.abs(m.daysToExpiry)}d ago`
    : m.membershipStatus === "expiring_soon" ? `in ${m.daysToExpiry}d`
    : `Renews in ${m.daysToExpiry}d`;
  return (
    <div className="d1-ms">
      <span className={`fs-pill fs-pill--${tone}`}><span className="fs-pill__dot" /> {label}</span>
      <span className="d1-ms__sub">{sub} · {m.currentPackageName}</span>
    </div>
  );
}

function DirectionHybrid() {
  const all = window.MOCK_MEMBERS;

  const [query, setQuery] = useState4("");
  const [bucket, setBucket] = useState4("all");
  const [sortKey, setSortKey] = useState4("name");
  const [selected, setSelected] = useState4(new Set());
  const [page, setPage] = useState4(1);
  const [dismissed, setDismissed] = useState4(new Set());
  const [bulkMode, setBulkMode] = useState4(null);
  const [programId, setProgramId] = useState4(window.MOCK_PROGRAMS[0].id);
  const [toast, setToast] = useState4(null);
  const PAGE_SIZE = 6;

  const stats = useMemo4(() => {
    const total = all.length;
    const active = all.filter((m) => m.isActive).length;
    const noPlan = all.filter((m) => !m.hasPlan).length;
    const expiring = all.filter((m) => m.membershipStatus === "expiring_soon").length;
    const expired = all.filter((m) => m.membershipStatus === "expired").length;
    return { total, active, noPlan, expiring, expired };
  }, [all]);

  // Action queue: one card per member, urgency-prioritised
  const queue = useMemo4(() => {
    const items = [];
    for (const m of all) {
      if (dismissed.has(m.id)) continue;
      if (m.membershipStatus === "expired") items.push({ m, type: "expired", p: 3 });
      else if (m.membershipStatus === "expiring_soon") items.push({ m, type: "expiring", p: 2 });
      else if (!m.hasPlan) items.push({ m, type: "noplan", p: 1 });
    }
    return items.sort((a, b) => b.p - a.p);
  }, [all, dismissed]);

  const filtered = useMemo4(() => {
    let list = all;
    if (bucket === "active") list = list.filter((m) => m.isActive);
    if (bucket === "no-plan") list = list.filter((m) => !m.hasPlan);
    if (bucket === "expiring") list = list.filter((m) => m.membershipStatus !== "active");
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((m) =>
      m.fullName.toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q)
    );
    const cmp = {
      name: (a, b) => a.fullName.localeCompare(b.fullName),
      newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      oldest: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
      expiry: (a, b) => a.daysToExpiry - b.daysToExpiry,
      status: (a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName)
    }[sortKey];
    return [...list].sort(cmp);
  }, [all, bucket, query, sortKey]);

  useEffect4(() => { setPage(1); }, [bucket, query, sortKey]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected = slice.length > 0 && slice.every((m) => selected.has(m.id));
  const someOnPage = !allOnPageSelected && slice.some((m) => selected.has(m.id));
  const cbAllRef = useRef4(null);
  useEffect4(() => {
    if (cbAllRef.current) cbAllRef.current.indeterminate = someOnPage;
  }, [someOnPage]);

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) slice.forEach((m) => next.delete(m.id));
      else slice.forEach((m) => next.add(m.id));
      return next;
    });
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function dismiss(id) { setDismissed((prev) => new Set([...prev, id])); }
  function singleAction(action, m) {
    const labels = {
      renew: `Renewal sent to ${m.fullName}`,
      assign: `Plan picker opened for ${m.fullName}`,
      message: `Composing message to ${m.fullName}`
    };
    setToast(labels[action] || `${action} · ${m.fullName}`);
    setTimeout(() => setToast(null), 2000);
    if (action === "renew" || action === "assign") dismiss(m.id);
  }
  function bulkRun(action) {
    const n = selected.size;
    const msg = {
      assign: `Assigned to ${n}`,
      restore: `Restored ${n}`,
      suspend: `Suspended ${n}`,
      message: `Drafted message to ${n}`,
      renew: `Renewal links sent to ${n}`
    }[action];
    setToast(msg);
    setSelected(new Set());
    setBulkMode(null);
    setTimeout(() => setToast(null), 2200);
  }
  function clearSelection() { setSelected(new Set()); setBulkMode(null); }

  const kpis = [
    { key: "all", label: "Total members", value: stats.total, hint: "All profiles", tone: "neutral" },
    { key: "active", label: "Active", value: stats.active, hint: `${Math.round(stats.active / stats.total * 100)}% of base`, tone: "brand" },
    { key: "no-plan", label: "Needs a plan", value: stats.noPlan, hint: "Workout unassigned", tone: "warn" },
    { key: "expiring", label: "Renewals due", value: stats.expiring + stats.expired, hint: stats.expired > 0 ? `${stats.expired} expired` : "Within 21d", tone: "danger" }
  ];

  return (
    <div className="fs-page d4-page">
      <div className="d4-wrap">
        {/* Header */}
        <header className="d4-header">
          <div>
            <div className="fs-breadcrumb">
              <a>Dashboard</a>
              <span className="fs-breadcrumb__sep">/</span>
              <span>Members</span>
            </div>
            <h1 className="fs-h1">Members</h1>
            <p className="fs-page-desc">
              {queue.length > 0
                ? <><strong>{queue.length}</strong> {queue.length === 1 ? "member needs" : "members need"} a quick action. {filtered.length} in the directory.</>
                : <>Your queue is clear. {stats.total} members in the directory.</>}
            </p>
          </div>
          <div className="d4-header__actions">
            <button className="fs-btn fs-btn--ghost">
              <window.Icons.Download size={15} /> Export
            </button>
            <button className="fs-btn fs-btn--brand">
              <window.Icons.Plus size={15} /> Add member
            </button>
          </div>
        </header>

        {/* ── Action queue ──────────────────────────────────────────────── */}
        {queue.length > 0 ? (
          <section className="d4-queue-section">
            <div className="d4-queue-head">
              <h2 className="d4-section-title">
                <span className="d4-section-title__pulse" />
                Action queue
                <span className="d4-section-title__count">{queue.length}</span>
              </h2>
              <div className="d4-queue-legend">
                {stats.expired > 0 && (<><span className="d4-legend-dot d4-legend-dot--danger" /><span>{stats.expired} expired</span></>)}
                {stats.expiring > 0 && (<><span className="d4-legend-dot d4-legend-dot--warn" /><span>{stats.expiring} expiring</span></>)}
                {stats.noPlan > 0 && (<><span className="d4-legend-dot d4-legend-dot--accent" /><span>{stats.noPlan} no plan</span></>)}
              </div>
            </div>
            <div className="d4-queue fs-scroll">
              {queue.map(({ m, type }) => (
                <QCard key={m.id} m={m} type={type} onAction={singleAction} onDismiss={dismiss} />
              ))}
            </div>
          </section>
        ) : (
          <section className="d4-queue-empty">
            <div className="d4-queue-empty__icon"><window.Icons.Trophy size={24} /></div>
            <div>
              <strong>All clear.</strong>
              <p>No renewals due, no plans missing.</p>
            </div>
          </section>
        )}

        {/* ── KPIs (clickable as filters) ──────────────────────────────── */}
        <div className="d4-kpis">
          {kpis.map((k) => {
            const sel = bucket === k.key;
            return (
              <button
                type="button"
                key={k.key}
                className={`d4-kpi d4-kpi--${k.tone} ${sel ? "d4-kpi--active" : ""}`}
                onClick={() => setBucket(k.key)}
                aria-pressed={sel}
              >
                <span className="d4-kpi__value">{k.value}</span>
                <span className="d4-kpi__label">{k.label}</span>
                <span className="d4-kpi__hint">{k.hint}</span>
              </button>
            );
          })}
        </div>

        {/* ── Directory (refined table) ────────────────────────────────── */}
        <section className="fs-surface d4-panel">
          <div className="d4-toolbar">
            <h2 className="d4-section-title d4-section-title--solo">
              Directory
              <span className="d4-section-title__count d4-section-title__count--muted">{filtered.length}</span>
            </h2>
            <label className="d4-search">
              <window.Icons.Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or @username"
              />
              {query && (
                <button className="d4-search__clear" onClick={() => setQuery("")} aria-label="Clear">
                  <window.Icons.X size={13} />
                </button>
              )}
            </label>
            <select
              className="fs-select d4-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="name">Sort · Name (A–Z)</option>
              <option value="newest">Sort · Newest</option>
              <option value="oldest">Sort · Oldest</option>
              <option value="expiry">Sort · Expiring soonest</option>
              <option value="status">Sort · Active first</option>
            </select>
          </div>

          <div className="d4-table-wrap">
            <table className="d1-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 220 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 56 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="fs-check"
                      ref={cbAllRef}
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Member</th>
                  <th>Membership</th>
                  <th>Workout plan</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.map((m) => {
                  const sel = selected.has(m.id);
                  return (
                    <tr
                      key={m.id}
                      className={`d1-row ${sel ? "d1-row--sel" : ""}`}
                      onClick={() => toggleOne(m.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="fs-check"
                          checked={sel}
                          onChange={() => toggleOne(m.id)}
                          aria-label={`Select ${m.fullName}`}
                        />
                      </td>
                      <td>
                        <div className="d1-member">
                          <span className={`fs-avatar fs-avatar--md ${ac4(m.id)}`}>
                            {m.avatarInitials}
                            <span className={`fs-avatar__dot fs-avatar__dot--${m.isActive ? "active" : "suspended"}`} />
                          </span>
                          <div>
                            <a className="d1-member__name" onClick={(e) => e.stopPropagation()}>{m.fullName}</a>
                            <div className="d1-member__sub">
                              @{m.username} · <span className="d1-member__goal">{m.goal}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><MCell m={m} /></td>
                      <td>
                        {m.hasPlan ? (
                          <div className="d1-plan">
                            <span className="fs-pill fs-pill--ghost">{m.program}</span>
                            {m.assignedTrainer && (
                              <span className="d1-plan__trainer">w/ {m.assignedTrainer}</span>
                            )}
                          </div>
                        ) : (
                          <span className="fs-pill fs-pill--outline">No plan</span>
                        )}
                      </td>
                      <td><span className="d1-joined">{window.fmtDateShort(m.joinedAt)}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="fs-btn fs-btn--ghost fs-btn--icon d1-row__more" aria-label="More">
                          <window.Icons.More size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="d1-empty">
                <window.Icons.Inbox size={32} />
                <p>{query ? `No matches for “${query}”` : "Nothing here."}</p>
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="d1-foot">
              <span className="d1-foot__info">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="d1-pager">
                <button
                  className="fs-btn fs-btn--ghost fs-btn--sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <window.Icons.ChevLeft size={14} /> Prev
                </button>
                <span className="d1-pager__label">
                  Page <strong>{safePage}</strong> of {totalPages}
                </span>
                <button
                  className="fs-btn fs-btn--ghost fs-btn--sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <window.Icons.ChevRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Dark bulk dock (from D1) */}
      {selected.size > 0 && (
        <div className="d1-dock" role="toolbar" aria-label="Bulk actions">
          {bulkMode === "assign" ? (
            <>
              <span className="d1-dock__count">{selected.size} selected</span>
              <select
                className="fs-select"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                {window.MOCK_PROGRAMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <button className="fs-btn fs-btn--brand fs-btn--sm" onClick={() => bulkRun("assign")}>
                Assign to {selected.size}
              </button>
              <button className="fs-btn fs-btn--ghost fs-btn--sm" onClick={() => setBulkMode(null)}>
                Back
              </button>
            </>
          ) : (
            <>
              <span className="d1-dock__count">{selected.size} selected</span>
              <div className="d1-dock__divider" />
              <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => setBulkMode("assign")}>
                <window.Icons.Dumbbell size={14} /> Assign program
              </button>
              <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("renew")}>
                <window.Icons.Repeat size={14} /> Renew
              </button>
              <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("message")}>
                <window.Icons.Mail size={14} /> Message
              </button>
              <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("restore")}>
                <window.Icons.Play size={14} /> Restore
              </button>
              <button className="fs-btn fs-btn--danger fs-btn--sm" onClick={() => bulkRun("suspend")}>
                <window.Icons.Pause size={14} /> Suspend
              </button>
              <div className="d1-dock__divider" />
              <button className="fs-btn fs-btn--ghost fs-btn--icon" onClick={clearSelection} aria-label="Clear">
                <window.Icons.X size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {toast && (
        <div className="fs-toast"><window.Icons.Check size={15} /> {toast}</div>
      )}
    </div>
  );
}

window.DirectionHybrid = DirectionHybrid;
