"use client";

import { useEffect, useMemo, useState } from "react";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskForm from "./TaskForm";
import { fetchTasks } from "@/components/useTasks";
import { useUser } from "@/hooks/useAuth";

/** Minimal UI Task shape that matches what this screen renders */
export type UITask = {
  id: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string | number | null; // we'll show as text/number
  status?: string | null;
  // for details modal:
  createdBy?: { id?: string | null; name?: string } | null;
  ownedBy?: { id?: string | null; name?: string } | null;
  collaborators?: Array<{ id: string; name?: string }> | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  parentTaskId?: number | null;
  project_id?: number | null;
  project?: { id: number; name: string } | null;
};

// Helper function to convert priority number to text label
function getPriorityLabel(priorityId: number | null): string {
  if (!priorityId) return "—";
  if (priorityId <= 3) return "High";
  if (priorityId <= 6) return "Medium";
  if (priorityId <= 10) return "Low";
  return "—";
}

function mapDbToUI(t: any): UITask {
  console.log("mapDbToUI input:", t);
  console.log("Raw priority data:", {
    priority_obj: t.priority,
    priority_id_field: t.priority_id,
    extracted_id: t.priority?.id ?? t.priority_id ?? null
  });
  
  const priorityId = t.priority?.id ?? t.priority_id ?? null;
  const priorityLabel = getPriorityLabel(priorityId);
  
  console.log(`Task ${t.id} "${t.title}": priority_id=${priorityId} → label="${priorityLabel}"`);
  
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    startDate: t.startDate ?? t.start_date ?? null,
    endDate: t.endDate ?? t.end_date ?? null,
    priority: getPriorityLabel(priorityId),      // Convert to "High", "Medium", "Low"
    status: t.status?.status ?? t.status ?? null,      // text from status table
    createdBy: t.created_by
      ? { id: t.created_by, name: t.created_by_email || t.created_by }
      : null,
    ownedBy: t.owned_by ? { id: t.owned_by, name: t.owned_by_email ?? t.owned_by } : null,
    collaborators: Array.isArray(t.assignees)
      ? t.assignees.map((id: string) => ({ id }))
      : [],
    tags: t.tags ?? [],
    createdAt: t.created_at ?? undefined,
    updatedAt: t.updated_at ?? undefined,
    parentTaskId: t.parent_task_id ?? null,
    project_id: t.project_id ?? null,
    project: t.project ?? null,
  };
}

export default function TaskDashboard() {
  const { userId, role } = useUser();
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [detailsTask, setDetailsTask] = useState<UITask | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UITask | null>(null);

  const [sortField, setSortField] = useState<'title' | 'status' | 'priority' | 'endDate' | 'tags' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  async function load() {
    try {
      console.log("Loading tasks from API...");
      console.log("User context:", { userId, role });
      // Pass user context to API for role-based filtering
      const dbTasks = await fetchTasks({ 
        userId: userId || undefined, 
        role: role || undefined 
      });
      console.log("Fetched tasks count:", dbTasks.length);
      console.log("Fetched tasks:", dbTasks);
      const mappedTasks = dbTasks.map(mapDbToUI);
      console.log("Mapped tasks count:", mappedTasks.length);
      console.log("Mapped tasks with priorities:", mappedTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority })));
      setTasks(mappedTasks);
    } catch (e) {
      console.error("Error loading tasks:", e);
      setTasks([]);
    }
  }

  useEffect(() => {
    if (userId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // Sorting function
  const sortTasks = (tasks: UITask[], field: typeof sortField, direction: typeof sortDirection) => {
    return [...tasks].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (field) {
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'priority':
          // Priority order: High > Medium > Low
          const priorityOrder: Record<string, number> = {
            'High': 3,
            'Medium': 2,
            'Low': 1,
            '—': 0
          };
          aVal = priorityOrder[a.priority as string] ?? 0;
          bVal = priorityOrder[b.priority as string] ?? 0;
          break;
        case 'endDate':
          aVal = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER;
          bVal = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        case 'tags':
          aVal = a.tags?.join(', ') || '';
          bVal = b.tags?.join(', ') || '';
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return direction === 'asc' ? -1 : 1;
      if (bVal === null) return direction === 'asc' ? 1 : -1;

      // Compare values
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const sortedTasks = useMemo(() => sortTasks(tasks, sortField, sortDirection), [tasks, sortField, sortDirection]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortMenu(false);
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <button
          className="rounded bg-black text-white px-4 py-2"
          onClick={() => setCreating(true)}
        >
          Create Task
        </button>
      </div>

      {/* Sort indicator */}
      {sortedTasks.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 px-4 py-2 rounded-lg border">
          <span className="font-medium">Sorted by</span>
          <span className="font-semibold text-gray-800">
            {sortField === 'title' ? 'Title' :
             sortField === 'status' ? 'Status' :
             sortField === 'priority' ? 'Priority' :
             sortField === 'endDate' ? 'Due Date' :
             sortField === 'tags' ? 'Tags' : 'Date Created'}
          </span>
          <div className={`flex items-center justify-center w-6 h-6 rounded ${sortDirection === 'asc' ? 'bg-green-100' : 'bg-blue-100'}`}>
            <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'text-green-700' : 'text-blue-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTasks.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border p-4 hover:shadow cursor-pointer"
            onClick={() => {
              console.log("Clicked task:", t);
              console.log("Task priority:", t.priority, "Type:", typeof t.priority);
              setDetailsTask(t);
            }}
            aria-label={`Open details for ${t.title}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.title}</h3>
              {t.priority && t.priority !== "—" && (
                <span className="text-xs rounded-full border px-2 py-0.5">
                  {t.priority}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Project: {t.project?.name || "(none)"}
            </div>
            {t.tags && t.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {t.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-sm text-gray-600 line-clamp-2">
              {t.description || "No description"}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div>{t.status || "—"}</div>
              <div>{t.endDate ? new Date(t.endDate).toLocaleDateString() : "—"}</div>
            </div>
          </div>
        ))}
        {!sortedTasks.length && (
          <p className="text-gray-500">No tasks yet. Create your first task.</p>
        )}
      </div>

      {/* Create */}
      {creating && (
        <Modal title="Create Task" onClose={() => setCreating(false)}>
          <TaskForm
            mode="create"
            onSaved={async () => {
              console.log("Task created, reloading...");
              setCreating(false);
              await load(); // Reload all tasks from API
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {/* Details */}
      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          onClose={() => setDetailsTask(null)}
          onEdit={() => {
            setEditing(detailsTask);
            setDetailsTask(null);
          }}
        />
      )}

      {/* Edit */}
      {editing && (
        <Modal title="Edit Task" onClose={() => setEditing(null)}>
          <TaskForm
            mode="edit"
            initial={editing}
            onSaved={async () => {
              console.log("Task edited, reloading...");
              setEditing(null);
              await load(); // Reload all tasks from API
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
