import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      {crumbs.map((crumb, i) => (
        <span className="breadcrumb-item" key={i}>
          {i > 0 && <span aria-hidden="true" className="breadcrumb-sep">/</span>}
          {crumb.href ? (
            <Link className="breadcrumb-link" href={crumb.href}>
              {crumb.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
