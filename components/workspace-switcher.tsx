import Link from "next/link";
import { getGymWorkspaces, getRoleSummary } from "@/lib/firebase/read-models";

export async function WorkspaceSwitcher({ mode = "owner" }: { mode?: "admin" | "owner" }) {
  const [{ gyms }, roles] = await Promise.all([getGymWorkspaces(), getRoleSummary()]);
  const currentWorkspace = gyms.find((workspace) => workspace.slug === "shg") ?? gyms[0];

  return (
    <div className="workspace-switcher" aria-label="Gym selector">
      <label>
        Select Gym
        <select defaultValue={currentWorkspace.id}>
          {gyms.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>
      {mode === "admin" ? (
        <Link className="button button-secondary" href="/admin/gyms">
          Manage gyms
        </Link>
      ) : (
        <span className="member-meta">{roles.ownerAccess}</span>
      )}
    </div>
  );
}
