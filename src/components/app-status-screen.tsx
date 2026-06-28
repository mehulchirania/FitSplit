"use client";

import Link from "next/link";

type StatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type AppStatusScreenProps = {
  code?: string;
  eyebrow?: string;
  title: string;
  body: string;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
};

function StatusButton({ action, variant }: { action: StatusAction; variant: "primary" | "secondary" }) {
  const className = `button button-${variant}`;

  if (action.href) {
    return (
      <Link className={className} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className={className} onClick={action.onClick} type="button">
      {action.label}
    </button>
  );
}

export function AppStatusScreen({
  code,
  eyebrow,
  title,
  body,
  primaryAction,
  secondaryAction
}: AppStatusScreenProps) {
  return (
    <main className="app-status-screen" role="status">
      <div className="app-status-panel">
        {code && <span className="app-status-code">{code}</span>}
        {eyebrow && <p className="app-status-eyebrow">{eyebrow}</p>}
        <h1 className="app-status-title">{title}</h1>
        <p className="app-status-body">{body}</p>
        {(primaryAction || secondaryAction) && (
          <div className="app-status-actions">
            {primaryAction && <StatusButton action={primaryAction} variant="primary" />}
            {secondaryAction && <StatusButton action={secondaryAction} variant="secondary" />}
          </div>
        )}
      </div>
    </main>
  );
}
