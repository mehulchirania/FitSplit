import Link from "next/link";
import { NotificationList } from "@/components/notification-list";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getOwnerNotifications } from "@/lib/firebase/read-models";
import type { Notification } from "@/types/domain";

export const dynamic = "force-dynamic";

const FILTER_TABS = [
  { key: "all",     label: "All" },
  { key: "unread",  label: "Unread" },
  { key: "pt",      label: "PT Sessions" },
  { key: "members", label: "Members" },
  { key: "other",   label: "Other" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

function filterNotifications(items: Notification[], tab: FilterKey): Notification[] {
  switch (tab) {
    case "unread":  return items.filter((n) => !n.readAt);
    case "pt":      return items.filter((n) => n.type.startsWith("pt_session"));
    case "members": return items.filter((n) =>
      ["member_created", "membership_expiring_soon", "membership_expired",
       "membership_renewed", "member_access_toggled", "access_suspended",
       "access_restored"].includes(n.type)
    );
    case "other":   return items.filter((n) =>
      !n.type.startsWith("pt_session") &&
      !["member_created", "membership_expiring_soon", "membership_expired",
        "membership_renewed", "member_access_toggled", "access_suspended",
        "access_restored"].includes(n.type)
    );
    default:        return items;
  }
}

export default async function OwnerNotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ notifications }, { tab: rawTab }] = await Promise.all([
    getOwnerNotifications(gymId),
    searchParams
  ]);

  const tab = (FILTER_TABS.map((t) => t.key).includes(rawTab as FilterKey)
    ? rawTab as FilterKey
    : "all");

  const filtered = filterNotifications(notifications, tab);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Notifications</div>
          <h1 className="adm-title">
            Notifications
            {unreadCount > 0 && (
              <span className="adm-inbox-tag adm-inbox-tag--warn" style={{ marginLeft: 10, verticalAlign: "middle" }}>
                {unreadCount} unread
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Filter chips */}
      <div className="adm-filter-bar" style={{ marginBottom: 16 }}>
        <div className="adm-chips">
          {FILTER_TABS.map((t) => {
            const count = t.key === "all"
              ? notifications.length
              : t.key === "unread"
              ? unreadCount
              : filterNotifications(notifications, t.key).length;
            return (
              <Link
                key={t.key}
                href={`/owner/notifications?tab=${t.key}`}
                className={`adm-chip${tab === t.key ? " adm-chip--on" : ""}`}
              >
                {t.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card__body adm-card__body--flush">
          <NotificationList items={filtered} />
        </div>
      </div>
    </div>
  );
}
