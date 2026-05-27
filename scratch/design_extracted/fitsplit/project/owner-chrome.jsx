// Shared owner-dashboard chrome (sidebar + top bar) used by all 3 directions.

function O_Sidebar({ tab, setTab, gym }) {
  const items = [
    { v: "dashboard", label: "Dashboard", icon: <window.MIcons.Home size={17} /> },
    { v: "members", label: "Members", icon: <window.MIcons.Dumbbell size={17} />, count: 247 },
    { v: "training", label: "Training", icon: <window.MIcons.Activity size={17} /> },
    { v: "programs", label: "Programs", icon: <window.MIcons.Note size={17} /> },
    { v: "billing", label: "Billing", icon: <window.MIcons.Trophy size={17} />, alert: 7 },
    { v: "reports", label: "Reports", icon: <window.MIcons.Chart size={17} /> }
  ];

  return (
    <aside className="o-side">
      <div className="o-side__brand">
        <div className="o-side__brand-mark">
          <window.MIcons.Lightning size={16} />
        </div>
        <div className="o-side__brand-info">
          <span>FitSplit</span>
          <small>{gym.name} · {gym.branch}</small>
        </div>
      </div>

      <span className="o-side__nav-label">Manage</span>
      <div className="o-side__nav">
        {items.map((it) => (
          <button
            key={it.v}
            className={`o-side__item ${tab === it.v ? "o-side__item--on" : ""}`}
            onClick={() => setTab && setTab(it.v)}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.alert ? (
              <span className="o-side__item-count o-side__item-count--alert">{it.alert}</span>
            ) : it.count ? (
              <span className="o-side__item-count">{it.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <span className="o-side__nav-label">Settings</span>
      <div className="o-side__nav">
        <button className="o-side__item">
          <window.MIcons.Note size={17} />
          <span>Gym profile</span>
        </button>
        <button className="o-side__item">
          <window.MIcons.User size={17} />
          <span>Staff & roles</span>
        </button>
        <button className="o-side__item">
          <window.MIcons.Settings size={17} />
          <span>Preferences</span>
        </button>
      </div>

      <div className="o-side__profile">
        <span className="fm-avatar fm-avatar--sm">{window.MOCK_OWNER.owner.avatarInitials}</span>
        <div className="o-side__profile-text">
          <strong>{window.MOCK_OWNER.owner.firstName} Nair</strong>
          <small>{window.MOCK_OWNER.owner.role}</small>
        </div>
        <window.MIcons.More size={16} />
      </div>
    </aside>
  );
}

function O_TopBar({ eyebrow, title, onToast }) {
  return (
    <header className="o-top">
      <div className="o-top__title">
        {eyebrow && <span className="o-top__eyebrow">{eyebrow}</span>}
        <h1 className="o-top__h">{title}</h1>
      </div>
      <div className="o-top__right">
        <div className="o-top__search">
          <window.MIcons.Search size={14} />
          <input placeholder="Search members, payments…" />
          <kbd>⌘K</kbd>
        </div>
        <button className="o-top__icon" onClick={() => onToast && onToast("3 notifications")} aria-label="Notifications">
          <window.MIcons.Bell size={18} />
          <span className="o-top__icon-dot" />
        </button>
        <button className="fm-btn fm-btn--brand fm-btn--sm" onClick={() => onToast && onToast("Add member opened")}>
          <window.MIcons.Plus size={14} /> Add member
        </button>
      </div>
    </header>
  );
}

window.O_Sidebar = O_Sidebar;
window.O_TopBar = O_TopBar;
