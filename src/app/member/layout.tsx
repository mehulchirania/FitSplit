import "../styles/32-member-app.css";
import "../styles/33-member-rehab.css";
import { requireAuth } from "@/lib/auth";

/** Everything under /member is the signed-in app: one container carries the app type face and safe areas. */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <div className="fs">{children}</div>;
}
