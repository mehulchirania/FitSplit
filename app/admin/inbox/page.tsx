import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getContactMessages } from "@/lib/firebase/read-models";
import { AdminInboxClient } from "@/components/admin-inbox-client";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  await requireRole(["admin"]);
  const { messages } = await getContactMessages();
  const unreadCount = messages.filter(m => m.status === "unread").length;

  return (
    <div className="odp2-scroll">
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Inbox</div>
          <h1 className="adm-title">Support inbox</h1>
        </div>
        <div className="adm-head-actions">
          <span className="adm-btn adm-btn--ghost adm-btn--active">Inbox</span>
        </div>
      </div>

      <p className="adm-page-desc">
        Support requests, feature suggestions, and incident reports from gym owners.
      </p>

      <AdminInboxClient messages={messages} unreadCount={unreadCount} />
    </div>
  );
}
