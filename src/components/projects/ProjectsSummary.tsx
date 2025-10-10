// components/projects/ProjectsSummary.tsx
"use client";

import { summarizeStatuses } from "@/lib/projects";
import type { ProjectWithTasks } from "@/lib/projects";


type Props = {
  projects: ProjectWithTasks[];
  selectedProjectId: number | null;                 // controlled
  onSelect: (id: number | null) => void;
};

export default function ProjectsSummary({ projects, selectedProjectId, onSelect }: Props) {
  return (
    <div>
      <h3 className="p-4 text-xl font-bold">Projects</h3>

      {/* horizontal tab bar */}
      <div className="px-4 flex overflow-x-auto gap-3">
        {projects.map((p) => {
          const s = summarizeStatuses(p.tasks);
          const isActive = selectedProjectId === p.id;

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={[
                "shrink-0 rounded-lg border px-4 py-3 text-left transition-colors",
                isActive ? "shadow-md bg-gray-200 border-black" : "bg-white hover:bg-gray-100",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{p.name}</span>
              </div>
              <div className="text-xs opacity-70">
                Total Tasks: {p.tasks.length}
              </div>

              {/* quick status counts inside the button */}
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <Badge label="Pending"     value={s.pending} />
                <Badge label="In Progress"    value={s.inProgress} />
                <Badge label="Done"        value={s.completed} />
                <Badge label="Blocked"     value={s.blocked} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-100 px-2 py-1 text-center border">
      <div className="font-semibold">{value}</div>
      <div className="opacity-70">{label}</div>
    </div>
  );
}
