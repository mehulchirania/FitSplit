import type { Notification } from "@/types/domain";

export function NotificationList({ items }: { items: Notification[] }) {
  if (items.length === 0) {
    return (
      <div className="notification-list" style={{ padding: "16px", textAlign: "center", color: "var(--text-soft)" }}>
        No new notifications for you!
      </div>
    );
  }

  return (
    <div className="notification-list">
      {items.map((item) => (
        <article className="notification-row" key={item.id}>
          <span className="notification-dot" />
          <div>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
