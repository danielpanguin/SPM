"use client";

import { useEffect, useMemo, useState } from "react";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskForm from "./TaskForm";
import { fetchTasks } from "@/components/useTasks";

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

function mapDbToUI(t: any): UITask {
  console.log("mapDbToUI input:", t);
  console.log("project_id:", t.project_id, "project:", t.project);
  
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    startDate: t.start_date ?? null,
    endDate: t.end_date ?? null,
    priority: t?.priority?.id ?? null,      // number (1..10)
    status: t?.status?.status ?? null,      // text from status table
    createdBy: t.created_by
      ? { id: t.created_by, name: t.created_by_email || t.created_by }
      : null,
    ownedBy: t.owned_by ? { id: t.owned_by, name: t.owned_by_email || t.owned_by } : null,
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
      const dbTasks = await fetchTasks(); // calls /api/tasks
      console.log("Fetched tasks:", dbTasks);
      const mappedTasks = dbTasks.map(mapDbToUI);
      console.log("Mapped tasks:", mappedTasks);
      setTasks(mappedTasks);
    } catch (e) {
      console.error("Error loading tasks:", e);
      setTasks([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          aVal = a.priority ? (typeof a.priority === 'number' ? a.priority : parseInt(String(a.priority))) : 999;
          bVal = b.priority ? (typeof b.priority === 'number' ? b.priority : parseInt(String(b.priority))) : 999;
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Tasks</h2>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <span className="font-medium">
                {sortField === 'title' ? 'Title' :
                 sortField === 'status' ? 'Status' :
                 sortField === 'priority' ? 'Priority' :
                 sortField === 'endDate' ? 'Due Date' :
                 sortField === 'tags' ? 'Tags' : 'Date Created'}
              </span>
            </button>

            {showSortMenu && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {[
                  { key: 'createdAt', label: 'Date Created' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'endDate', label: 'Due Date' },
                  { key: 'tags', label: 'Tags' },
                ].map(({ key, label }) => (
                  <div key={key} className="relative group">
                    <button
                      onClick={() => toggleSort(key as typeof sortField)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        sortField === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortField(key as typeof sortField);
                              setSortDirection('asc');
                              setShowSortMenu(false);
                            }}
                            className={`p-1 rounded transition-colors ${
                              sortField === key && sortDirection === 'asc'
                                ? 'bg-green-600 text-white'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title="Sort ascending"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortField(key as typeof sortField);
                              setSortDirection('desc');
                              setShowSortMenu(false);
                            }}
                            className={`p-1 rounded transition-colors ${
                              sortField === key && sortDirection === 'desc'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Sort descending"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            onClick={() => setDetailsTask(t)}
            aria-label={`Open details for ${t.title}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.title}</h3>
              <span className="text-xs rounded-full border px-2 py-0.5">
                {t.priority ? `P${t.priority}` : "—"}
              </span>
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
