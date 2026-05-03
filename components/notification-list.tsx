import type { Notification } from "@/types/domain";

export function NotificationList({ items }: { items: Notification[] }) {
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
