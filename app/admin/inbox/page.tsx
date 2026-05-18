import { Breadcrumb } from "@/components/breadcrumb";
import { getContactMessages } from "@/lib/firebase/read-models";
import { requireRole } from "@/lib/auth";
import { markContactMessageRead } from "@/lib/firebase/actions";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  await requireRole(["admin"]);
  const { messages } = await getContactMessages();
  const unreadCount = messages.filter((message) => message.status === "unread").length;

  return (
    <main className="page">
      <header className="dashboard-header compact-header">
        <div>
          <Breadcrumb crumbs={[{ label: "Admin", href: "/admin" }, { label: "Inbox" }]} />
          <h1>Inbox</h1>
          <p>View landing page inquiries and follow up with potential gyms.</p>
        </div>
        <div className="summary-panel">
          <span className="member-meta">Unread messages</span>
          <strong className="inbox-count">{unreadCount}</strong>
        </div>
      </header>

      <section className="list-panel">
        <div className="panel-title">
          <h2>Contact messages</h2>
          <span className="status-pill status-neutral">{messages.length} total</span>
        </div>
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet.</p>
          </div>
        ) : (
          <div className="inbox-list">
            {messages.map((message) => (
              <article className={`inbox-message ${message.status === "unread" ? "is-unread" : ""}`} key={message.id}>
                <div className="inbox-message-header">
                  <div>
                    <h3>{message.name}</h3>
                    <p>{message.mobile}{message.email ? ` · ${message.email}` : ""}</p>
                  </div>
                  <span className="member-meta">
                    {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="inbox-message-body">{message.body}</p>
                <div className="inbox-actions">
                  {message.status === "unread" ? (
                    <form
                      action={async (formData) => {
                        "use server";
                        await markContactMessageRead(formData);
                      }}
                    >
                      <input name="messageId" type="hidden" value={message.id} />
                      <button className="button button-secondary" type="submit">
                        Mark as read
                      </button>
                    </form>
                  ) : (
                    <span className="status-pill status-active">Read</span>
                  )}
                  <a href={`tel:${message.mobile}`} className="button button-primary">
                    Call Back
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
