import { getGymWorkspaces, getRoleSummary } from "@/lib/firebase/read-models";

export async function WorkspaceSwitcher({ mode = "owner" }: { mode?: "admin" | "owner" }) {
  const [{ gyms }, roles] = await Promise.all([getGymWorkspaces(), getRoleSummary()]);
  const currentWorkspace = gyms.find((workspace) => workspace.slug === "titan-v2-fitness") ?? gyms[0];

  return (
    <div className="workspace-switcher" aria-label="Gym selector">
      <label>
        Select Gym
        <select defaultValue={currentWorkspace.id} disabled={mode === "owner"}>
          {gyms.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>
      <span className="member-meta">
        {mode === "admin" ? "Admin can add more gyms later" : roles.ownerAccess}
      </span>
    </div>
  );
}
