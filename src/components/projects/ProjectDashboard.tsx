"use client";

import { useEffect, useState } from "react";
import { fetchProjectsWithTasks, type ProjectWithTasks } from "@/lib/projects";
import ProjectsSummary from "@/components/projects/ProjectsSummary";
import ProjectList from "@/components/projects/ProjectList";

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const rows = await fetchProjectsWithTasks();
      setProjects(rows);
      // default select first project
      if (rows.length && selectedProjectId == null) setSelectedProjectId(rows[0].id);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <ProjectsSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={setSelectedProjectId}
      />
      <ProjectList
        projects={projects}
        selectedProjectId={selectedProjectId}
      />
    </div>
  );
}
