import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  body?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-heading">{heading}</h3>
      {body && <p className="empty-state-body">{body}</p>}
      {action && (
        action.href ? (
          <Link className="button button-secondary" href={action.href}>
            {action.label}
          </Link>
        ) : (
          <button className="button button-secondary" onClick={action.onClick} type="button">
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
