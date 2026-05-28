// Direction 1 — Refined: clean, restrained iteration of the current table
// Fixes: subtle KPIs, unified filter+sort bar, prominent search, dock-style bulk bar, membership column.

const { useState, useMemo, useEffect, useRef } = React;

function avatarColor(id) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return `fs-avatar--c${(n % 6) + 1}`;
}

// ── KPI strip ────────────────────────────────────────────────────────────
function KpiStrip({ stats, active, onSelect }) {
  const items = [
    { key: "all", label: "Total members", value: stats.total, hint: "All profiles", tone: "neutral" },
    { key: "active", label: "Active", value: stats.active, hint: `${Math.round((stats.active / stats.total) * 100)}% of base`, tone: "brand" },
    { key: "no-plan", label: "Needs a plan", value: stats.noPlan, hint: "Workout unassigned", tone: "warn" },
    { key: "expiring", label: "Expiring or expired", value: stats.expiring + stats.expired, hint: stats.expired > 0 ? `${stats.expired} expired` : "Renewals due", tone: "danger" }
  ];
  return (
    <div className="d1-kpis">
      {items.map((k) => {
        const sel = active === k.key;
        return (
          <button
            type="button"
            key={k.key}
            className={`d1-kpi d1-kpi--${k.tone} ${sel ? "d1-kpi--active" : ""}`}
            onClick={() => onSelect(k.key)}
            aria-pressed={sel}
          >
            <span className="d1-kpi__value">{k.value}</span>
            <span className="d1-kpi__label">{k.label}</span>
            <span className="d1-kpi__hint">{k.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Membership status cell ──────────────────────────────────────────────
function MembershipCell({ m }) {
  const { membershipStatus, daysToExpiry, currentPackageName } = m;
  let tone = "brand";
  let label = "Active";
  let sub = `Renews in ${daysToExpiry}d`;
  if (membershipStatus === "expired") {
    tone = "danger";
    label = "Expired";
    sub = `${Math.abs(daysToExpiry)}d ago`;
  } else if (membershipStatus === "expiring_soon") {
    tone = "warn";
    label = "Expiring";
    sub = `in ${daysToExpiry}d`;
  }
  return (
    <div className="d1-ms">
      <span className={`fs-pill fs-pill--${tone === "brand" ? "brand" : tone}`}>
        <span className="fs-pill__dot" /> {label}
      </span>
      <span className="d1-ms__sub">{sub} · {currentPackageName}</span>
    </div>
  );
}

// ── The page ────────────────────────────────────────────────────────────
function DirectionOne() {
  const all = window.MOCK_MEMBERS;

  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all"); // matches KPI key
  const [sortKey, setSortKey] = useState("name");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [bulkMode, setBulkMode] = useState(null); // null | "assign"
  const [programId, setProgramId] = useState(window.MOCK_PROGRAMS[0].id);
  const PAGE_SIZE = 8;

  const stats = useMemo(() => {
    const total = all.length;
    const active = all.filter((m) => m.isActive).length;
    const noPlan = all.filter((m) => !m.hasPlan).length;
    const expiring = all.filter((m) => m.membershipStatus === "expiring_soon").length;
    const expired = all.filter((m) => m.membershipStatus === "expired").length;
    return { total, active, noPlan, expiring, expired };
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (bucket === "active") list = list.filter((m) => m.isActive);
    if (bucket === "no-plan") list = list.filter((m) => !m.hasPlan);
    if (bucket === "expiring")
      list = list.filter((m) => m.membershipStatus !== "active");

    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          (m.username || "").toLowerCase().includes(q)
      );

    const cmp = {
      name: (a, b) => a.fullName.localeCompare(b.fullName),
      newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      oldest: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
      expiry: (a, b) => a.daysToExpiry - b.daysToExpiry,
      status: (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        a.fullName.localeCompare(b.fullName)
    }[sortKey];

    return [...list].sort(cmp);
  }, [all, bucket, query, sortKey]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [bucket, query, sortKey]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected = slice.length > 0 && slice.every((m) => selected.has(m.id));
  const someOnPage = !allOnPageSelected && slice.some((m) => selected.has(m.id));

  const cbAllRef = useRef(null);
  useEffect(() => {
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
  function clearSelection() {
    setSelected(new Set());
    setBulkMode(null);
  }
  function bulkRun(action) {
    const n = selected.size;
    const msgs = {
      assign: `Assigned to ${n} member${n > 1 ? "s" : ""}`,
      restore: `Restored access for ${n}`,
      suspend: `Suspended ${n}`,
      message: `Drafted message to ${n}`,
      renew: `Renewal links sent to ${n}`
    };
    setToast(msgs[action]);
    setSelected(new Set());
    setBulkMode(null);
    setTimeout(() => setToast(null), 2200);
  }

  const sortOptions = [
    { v: "name", l: "Name (A–Z)" },
    { v: "newest", l: "Newest first" },
    { v: "oldest", l: "Oldest first" },
    { v: "expiry", l: "Expiring soonest" },
    { v: "status", l: "Active first" }
  ];

  return (
    <div className="fs-page d1-page">
      <div className="d1-wrap">
        <header className="d1-header">
          <div>
            <div className="fs-breadcrumb">
              <a>Dashboard</a>
              <span className="fs-breadcrumb__sep">/</span>
              <span>Members</span>
            </div>
            <h1 className="fs-h1">Members</h1>
            <p className="fs-page-desc">
              Manage profiles, assign programs, and renew memberships.
            </p>
          </div>
          <div className="d1-header__actions">
            <button className="fs-btn fs-btn--ghost">
              <window.Icons.Download size={15} /> Export
            </button>
            <button className="fs-btn fs-btn--brand">
              <window.Icons.Plus size={15} /> Add member
            </button>
          </div>
        </header>

        <KpiStrip stats={stats} active={bucket} onSelect={setBucket} />

        <section className="fs-surface d1-panel">
          {/* toolbar: search + sort */}
          <div className="d1-toolbar">
            <label className="d1-search">
              <window.Icons.Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or @username"
                className="d1-search__input"
              />
              {query && (
                <button
                  className="d1-search__clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <window.Icons.X size={13} />
                </button>
              )}
            </label>
            <div className="d1-toolbar__right">
              <span className="d1-toolbar__count">
                {filtered.length} {filtered.length === 1 ? "member" : "members"}
              </span>
              <select
                className="fs-select d1-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                {sortOptions.map((o) => (
                  <option value={o.v} key={o.v}>Sort · {o.l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* table */}
          <div className="d1-table-wrap">
            <table className="d1-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 220 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 130 }} />
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
                          <span className={`fs-avatar fs-avatar--md ${avatarColor(m.id)}`}>
                            {m.avatarInitials}
                            <span className={`fs-avatar__dot fs-avatar__dot--${m.isActive ? "active" : "suspended"}`} />
                          </span>
                          <div>
                            <a className="d1-member__name" onClick={(e) => e.stopPropagation()}>
                              {m.fullName}
                            </a>
                            <div className="d1-member__sub">
                              @{m.username} · <span className="d1-member__goal">{m.goal}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><MembershipCell m={m} /></td>
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
                      <td>
                        <span className="d1-joined">{window.fmtDateShort(m.joinedAt)}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="fs-btn fs-btn--ghost fs-btn--icon d1-row__more" aria-label="More actions">
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
                <p>{query ? `No matches for “${query}”` : "Nothing here yet."}</p>
                {query && (
                  <button className="fs-btn fs-btn--ghost fs-btn--sm" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* pagination */}
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

      {/* Bulk dock */}
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
              <button className="fs-btn fs-btn--ghost fs-btn--icon" onClick={clearSelection} aria-label="Clear selection">
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

window.DirectionOne = DirectionOne;
