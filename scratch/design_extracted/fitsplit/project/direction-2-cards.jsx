// Direction 2 — Restructured: card-list with rich info & inline quick actions.
// Same data, denser rows that surface what owners actually need at a glance.

const { useState: useState2, useMemo: useMemo2, useEffect: useEffect2 } = React;

function avatarColor2(id) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return `fs-avatar--c${(n % 6) + 1}`;
}

// ── Segmented filter ────────────────────────────────────────────────────
function Seg({ value, onChange, options }) {
  return (
    <div className="d2-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="tab"
          aria-selected={value === o.v}
          className={`d2-seg__opt ${value === o.v ? "d2-seg__opt--on" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
          {o.count != null && (
            <span className="d2-seg__count">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── A single member card row ────────────────────────────────────────────
function MemberCard({ m, selected, onToggle, onAction }) {
  const expiryTone =
    m.membershipStatus === "expired"
      ? "danger"
      : m.membershipStatus === "expiring_soon"
        ? "warn"
        : "brand";
  const expiryLabel =
    m.membershipStatus === "expired"
      ? `Expired ${Math.abs(m.daysToExpiry)}d ago`
      : m.membershipStatus === "expiring_soon"
        ? `Expires in ${m.daysToExpiry}d`
        : `Renews ${window.fmtDateShort(m.membershipEndDate)}`;

  return (
    <div
      className={`d2-card ${selected ? "d2-card--sel" : ""} ${!m.isActive ? "d2-card--suspended" : ""}`}
      onClick={() => onToggle(m.id)}
      role="row"
    >
      <div className="d2-card__check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="fs-check"
          checked={selected}
          onChange={() => onToggle(m.id)}
          aria-label={`Select ${m.fullName}`}
        />
      </div>

      <div className="d2-card__ident">
        <span className={`fs-avatar fs-avatar--lg ${avatarColor2(m.id)}`}>
          {m.avatarInitials}
          <span className={`fs-avatar__dot fs-avatar__dot--${m.isActive ? "active" : "suspended"}`} />
        </span>
        <div className="d2-card__id">
          <div className="d2-card__name-row">
            <a className="d2-card__name" onClick={(e) => e.stopPropagation()}>
              {m.fullName}
            </a>
            {!m.isActive && (
              <span className="fs-pill fs-pill--ghost">
                <span className="fs-pill__dot" /> Suspended
              </span>
            )}
          </div>
          <div className="d2-card__meta">
            <span>@{m.username}</span>
            <span className="d2-card__sep">·</span>
            <span>{m.goal}</span>
            <span className="d2-card__sep">·</span>
            <span>Joined {window.fmtDateShort(m.joinedAt)}</span>
          </div>
        </div>
      </div>

      <div className="d2-card__plan">
        <span className="d2-card__col-label">Workout plan</span>
        {m.hasPlan ? (
          <>
            <span className="d2-card__value">{m.program}</span>
            <span className="d2-card__sub">
              {m.assignedTrainer ? `Coach ${m.assignedTrainer}` : "Self-guided"}
            </span>
          </>
        ) : (
          <>
            <span className="fs-pill fs-pill--warn">
              <span className="fs-pill__dot" /> No plan
            </span>
            <button
              className="d2-card__inline-cta"
              onClick={(e) => { e.stopPropagation(); onAction("assign", m); }}
            >
              Assign plan →
            </button>
          </>
        )}
      </div>

      <div className="d2-card__mem">
        <span className="d2-card__col-label">Membership</span>
        <span className="d2-card__value">{m.currentPackageName}</span>
        <span className={`d2-card__expiry d2-card__expiry--${expiryTone}`}>
          {m.membershipStatus !== "active" && (
            <window.Icons.AlertTriangle size={11} />
          )}
          {expiryLabel}
        </span>
      </div>

      <div className="d2-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="fs-btn fs-btn--ghost fs-btn--icon"
          title="Message"
          onClick={() => onAction("message", m)}
        >
          <window.Icons.Mail size={14} />
        </button>
        <button
          className="fs-btn fs-btn--ghost fs-btn--icon"
          title="Renew membership"
          onClick={() => onAction("renew", m)}
        >
          <window.Icons.Repeat size={14} />
        </button>
        <button
          className="fs-btn fs-btn--ghost fs-btn--icon"
          title={m.isActive ? "Suspend" : "Restore"}
          onClick={() => onAction(m.isActive ? "suspend" : "restore", m)}
        >
          {m.isActive ? <window.Icons.Pause size={14} /> : <window.Icons.Play size={14} />}
        </button>
        <button className="fs-btn fs-btn--ghost fs-btn--icon" title="Open profile">
          <window.Icons.ChevRight size={15} />
        </button>
      </div>
    </div>
  );
}

function DirectionTwo() {
  const all = window.MOCK_MEMBERS;
  const [query, setQuery] = useState2("");
  const [statusFilter, setStatusFilter] = useState2("all");
  const [planFilter, setPlanFilter] = useState2("all");
  const [memFilter, setMemFilter] = useState2("all");
  const [sortKey, setSortKey] = useState2("attention");
  const [selected, setSelected] = useState2(new Set());
  const [toast, setToast] = useState2(null);
  const [visible, setVisible] = useState2(10);

  const stats = useMemo2(() => ({
    total: all.length,
    active: all.filter((m) => m.isActive).length,
    suspended: all.filter((m) => !m.isActive).length,
    noPlan: all.filter((m) => !m.hasPlan).length,
    hasPlan: all.filter((m) => m.hasPlan).length,
    expiring: all.filter((m) => m.membershipStatus === "expiring_soon").length,
    expired: all.filter((m) => m.membershipStatus === "expired").length
  }), [all]);

  const filtered = useMemo2(() => {
    let list = all;
    if (statusFilter === "active") list = list.filter((m) => m.isActive);
    if (statusFilter === "suspended") list = list.filter((m) => !m.isActive);
    if (planFilter === "yes") list = list.filter((m) => m.hasPlan);
    if (planFilter === "no") list = list.filter((m) => !m.hasPlan);
    if (memFilter === "expiring")
      list = list.filter((m) => m.membershipStatus === "expiring_soon");
    if (memFilter === "expired")
      list = list.filter((m) => m.membershipStatus === "expired");
    if (memFilter === "active")
      list = list.filter((m) => m.membershipStatus === "active");
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q)
      );
    const cmp = {
      attention: (a, b) => {
        // priority: expired > expiring > no plan > rest
        const score = (x) =>
          (x.membershipStatus === "expired" ? 3 : 0) +
          (x.membershipStatus === "expiring_soon" ? 2 : 0) +
          (!x.hasPlan ? 1 : 0);
        return score(b) - score(a) || a.fullName.localeCompare(b.fullName);
      },
      name: (a, b) => a.fullName.localeCompare(b.fullName),
      newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      expiry: (a, b) => a.daysToExpiry - b.daysToExpiry
    }[sortKey];
    return [...list].sort(cmp);
  }, [all, statusFilter, planFilter, memFilter, query, sortKey]);

  useEffect2(() => { setVisible(10); }, [statusFilter, planFilter, memFilter, query, sortKey]);

  const slice = filtered.slice(0, visible);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected((prev) => {
      const all = filtered.map((m) => m.id);
      if (all.every((id) => prev.has(id))) return new Set();
      return new Set(all);
    });
  }
  function singleAction(action, m) {
    const labels = {
      message: `Composing message to ${m.fullName}`,
      renew: `Renewal link sent to ${m.fullName}`,
      suspend: `${m.fullName} suspended`,
      restore: `${m.fullName} restored`,
      assign: `Pick a program for ${m.fullName}`
    };
    setToast(labels[action]);
    setTimeout(() => setToast(null), 2200);
  }
  function bulkRun(action) {
    const n = selected.size;
    setToast(`${action === "assign" ? "Assigned" : action === "renew" ? "Sent renewal to" : action === "message" ? "Messaged" : action === "suspend" ? "Suspended" : "Restored"} ${n}`);
    setSelected(new Set());
    setTimeout(() => setToast(null), 2200);
  }

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  return (
    <div className="fs-page d2-page">
      <div className="d2-wrap">
        <header className="d2-header">
          <div>
            <div className="fs-breadcrumb">
              <a>Dashboard</a>
              <span className="fs-breadcrumb__sep">/</span>
              <span>Members</span>
            </div>
            <h1 className="fs-h1">Members</h1>
            <p className="fs-page-desc">
              {stats.total} profiles · {stats.expiring + stats.expired} need renewal · {stats.noPlan} without a plan
            </p>
          </div>
          <div className="d2-header__actions">
            <button className="fs-btn fs-btn--ghost">
              <window.Icons.Download size={15} /> Export CSV
            </button>
            <button className="fs-btn fs-btn--brand">
              <window.Icons.Plus size={15} /> Add member
            </button>
          </div>
        </header>

        {/* Search & filter bar */}
        <section className="d2-filter-bar fs-surface">
          <label className="d2-search">
            <window.Icons.Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or @username"
            />
            {query && (
              <button className="d2-search__clear" onClick={() => setQuery("")}>
                <window.Icons.X size={13} />
              </button>
            )}
          </label>

          <div className="d2-filter-bar__filters">
            <div className="d2-filter-group">
              <span className="d2-filter-group__label">Status</span>
              <Seg
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { v: "all", l: "All", count: stats.total },
                  { v: "active", l: "Active", count: stats.active },
                  { v: "suspended", l: "Suspended", count: stats.suspended }
                ]}
              />
            </div>
            <div className="d2-filter-group">
              <span className="d2-filter-group__label">Plan</span>
              <Seg
                value={planFilter}
                onChange={setPlanFilter}
                options={[
                  { v: "all", l: "All" },
                  { v: "yes", l: "Assigned", count: stats.hasPlan },
                  { v: "no", l: "None", count: stats.noPlan }
                ]}
              />
            </div>
            <div className="d2-filter-group">
              <span className="d2-filter-group__label">Membership</span>
              <Seg
                value={memFilter}
                onChange={setMemFilter}
                options={[
                  { v: "all", l: "Any" },
                  { v: "active", l: "Active", count: stats.total - stats.expiring - stats.expired },
                  { v: "expiring", l: "Expiring", count: stats.expiring },
                  { v: "expired", l: "Expired", count: stats.expired }
                ]}
              />
            </div>
          </div>

          <div className="d2-filter-bar__sort">
            <select
              className="fs-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="attention">Sort · Needs attention</option>
              <option value="name">Sort · Name (A–Z)</option>
              <option value="newest">Sort · Newest</option>
              <option value="expiry">Sort · Expiring soonest</option>
            </select>
          </div>
        </section>

        {/* Attention banner (when there are renewal-due/no-plan members and no filters applied) */}
        {statusFilter === "all" && planFilter === "all" && memFilter === "all" && !query && (stats.expired + stats.expiring > 0 || stats.noPlan > 0) && (
          <div className="d2-attention">
            <span className="d2-attention__icon">
              <window.Icons.AlertTriangle size={16} />
            </span>
            <div className="d2-attention__body">
              <strong>Needs your attention.</strong>
              <span>
                {stats.expired > 0 && <span><b>{stats.expired}</b> expired</span>}
                {stats.expired > 0 && stats.expiring > 0 && <span className="d2-attention__sep">·</span>}
                {stats.expiring > 0 && <span><b>{stats.expiring}</b> expiring within 21 days</span>}
                {(stats.expired + stats.expiring > 0) && stats.noPlan > 0 && <span className="d2-attention__sep">·</span>}
                {stats.noPlan > 0 && <span><b>{stats.noPlan}</b> with no workout plan</span>}
              </span>
            </div>
            <div className="d2-attention__cta">
              <button className="fs-btn fs-btn--ghost fs-btn--sm" onClick={() => setMemFilter("expiring")}>
                Review renewals
              </button>
              <button className="fs-btn fs-btn--ghost fs-btn--sm" onClick={() => setPlanFilter("no")}>
                Assign plans
              </button>
            </div>
          </div>
        )}

        {/* Result toolbar */}
        <div className="d2-result-toolbar">
          <label className="d2-select-all">
            <input
              type="checkbox"
              className="fs-check"
              checked={allSelected}
              onChange={selectAll}
            />
            <span>{allSelected ? "Deselect all" : `Select all ${filtered.length}`}</span>
          </label>
          <span className="d2-result-toolbar__count">
            Showing {Math.min(visible, filtered.length)} of {filtered.length}
          </span>
        </div>

        {/* Cards list */}
        <div className="d2-list">
          {slice.map((m) => (
            <MemberCard
              key={m.id}
              m={m}
              selected={selected.has(m.id)}
              onToggle={toggle}
              onAction={singleAction}
            />
          ))}
          {filtered.length === 0 && (
            <div className="d2-empty fs-surface">
              <window.Icons.Inbox size={32} />
              <p>No members match these filters.</p>
              <button
                className="fs-btn fs-btn--ghost fs-btn--sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setPlanFilter("all");
                  setMemFilter("all");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
          {filtered.length > visible && (
            <button className="d2-loadmore" onClick={() => setVisible((v) => v + 10)}>
              Load 10 more ({filtered.length - visible} remaining)
            </button>
          )}
        </div>
      </div>

      {/* Floating bulk bar */}
      {selected.size > 0 && (
        <div className="d2-bulk">
          <div className="d2-bulk__left">
            <span className="d2-bulk__count">{selected.size}</span>
            <span>selected</span>
          </div>
          <div className="d2-bulk__actions">
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("assign")}>
              <window.Icons.Dumbbell size={14} /> Assign program
            </button>
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("renew")}>
              <window.Icons.Repeat size={14} /> Send renewal
            </button>
            <button className="fs-btn fs-btn--subtle fs-btn--sm" onClick={() => bulkRun("message")}>
              <window.Icons.Mail size={14} /> Message
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

window.DirectionTwo = DirectionTwo;
