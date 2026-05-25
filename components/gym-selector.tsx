"use client";

import { useRouter } from "next/navigation";

type GymOption = {
  id: string;
  name: string;
};

export function GymSelector({
  gyms,
  label = "Select gym",
  paramName = "gym",
  pathname,
  selectedGymId
}: {
  gyms: GymOption[];
  label?: string;
  paramName?: string;
  pathname: string;
  selectedGymId: string;
}) {
  const router = useRouter();

  if (gyms.length <= 1) {
    return null;
  }

  return (
    <label className="gym-selector">
      <span>{label}</span>
      <select
        value={selectedGymId}
        onChange={(event) => {
          const params = new URLSearchParams();
          params.set(paramName, event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {gyms.map((gym) => (
          <option key={gym.id} value={gym.id}>
            {gym.name}
          </option>
        ))}
      </select>
    </label>
  );
}
