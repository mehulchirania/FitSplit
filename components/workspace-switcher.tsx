import { currentWorkspace, gyms, roles } from "@/lib/mock-data";

export function WorkspaceSwitcher({ mode = "owner" }: { mode?: "admin" | "owner" }) {
  return (
    <div className="workspace-switcher" aria-label="Workspace selector">
      <label>
        Workspace
        <select defaultValue={currentWorkspace.id} disabled={mode === "owner"}>
          {gyms.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>
      <span className="member-meta">
        {mode === "admin" ? roles.admin.access : roles.owner.access}
      </span>
    </div>
  );
}
