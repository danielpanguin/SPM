"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTaskAPI, updateTaskAPI } from "@/components/useTasks";
import type { UITask } from "./TaskDetailsModal";
import { useUser } from "@/hooks/useAuth";
import { notifyTaskSync } from "@/lib/notifyTaskSync";
import { AttachmentUpload } from "./AttachmentUpload";
import type { Attachment } from "@/types/attachment";

const MAX_TOTAL_ASSIGNEES = 5; // owner + collaborators
const MAX_COLLABORATORS = 4;   // collaborators only (excludes owner)

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<UITask>;
  onSaved(taskFromApi: any): void; // we map in parent
  onCancel?(): void;
  accessibleUserIds?: string[]; // User IDs that are accessible based on role
}

type DbRoleUser = { id: string; email?: string | null; roles?: { name?: string | null } | null };
type Option = { id: number; label: string };
type Project = { id: number; name: string };

export default function TaskForm({ mode, initial, onSaved, onCancel, accessibleUserIds }: Props) {
  const { userId: currentUserId, role } = useUser();

  const [users, setUsers] = useState<DbRoleUser[]>([]);
  const [statusOpts, setStatusOpts] = useState<Option[]>([]);
  const [prioOpts, setPrioOpts] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableParentTasks, setAvailableParentTasks] = useState<
    { id: number; title: string; start_date: string; end_date: string }[]
  >([]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ownedById, setOwnedById] = useState<string | undefined>(
    (initial?.ownedBy as any)?.id ?? (mode === "create" ? currentUserId : undefined)
  );
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(() => {
    const collabs = initial?.collaborators ?? [];
    return collabs.map((c: any) => c.id).filter((id: string) => id && typeof id === "string");
  });

  // Track initial collaborators to determine which can be removed
  const [initialCollaboratorIds] = useState<string[]>(() => {
    const collabs = initial?.collaborators ?? [];
    return collabs.map((c: any) => c.id).filter((id: string) => id && typeof id === "string");
  });
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [parentTaskId, setParentTaskId] = useState<number | "">(() => {
    if (initial?.parentTaskId) {
      const parsed =
        typeof initial.parentTaskId === "string"
          ? parseInt(initial.parentTaskId, 10)
          : initial.parentTaskId;
      return isNaN(parsed) ? "" : parsed;
    }
    return "";
  });

  // ▼▼ NEW: dropdown options for tags
  const [tagOptions, setTagOptions] = useState<Array<{ id: number; name: string }>>([]);
  // value remains the tag name (existing API expects names)
  const [tag, setTag] = useState((initial as any)?.tag ?? (initial?.tags?.[0] ?? ""));

  const [priorityId, setPriorityId] = useState<number | "">(() => {
    const priority = (initial as any)?.priority;
    if (typeof priority === "string" && priority.startsWith("P")) {
      return Number(priority.substring(1));
    }
    if (typeof (initial as any)?.priority_id === "number") {
      return (initial as any).priority_id;
    }
    return "";
  });
  const [statusId, setStatusId] = useState<number | "">(() => {
    const statusId = (initial as any)?.status_id;
    if (typeof statusId === "number") return statusId;
    return "";
  });
  const [projectId, setProjectId] = useState<number | "">((initial?.project_id as number) ?? "");
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAttachment, setCurrentAttachment] = useState<Attachment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // NEW: Store selected file for deferred upload
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null); // NEW: Store attachment ID marked for deletion

  // Staff (role_id 3) cannot edit the owner field
  const canEditOwner = role !== "staff";
  // Staff cannot remove collaborators in edit mode (but can add in both modes)
  const canRemoveCollaborators = role !== "staff";

  // 🔁 Recurrence — initialize from either the flat DB columns or nested object
  const [isRecurring, setIsRecurring] = useState<boolean>(
    Boolean(
      (initial as any)?.is_recurring ??
        (initial as any)?.recurrence?.isRecurring ??
        false
    )
  );
  const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState<number>(
    Number(
      (initial as any)?.interval_days ??
        (initial as any)?.recurrence?.intervalDays ??
        1
    )
  );
  const [recurrenceCount, setRecurrenceCount] = useState<number>(
    Number(
      (initial as any)?.num_of_recur ??
        (initial as any)?.recurrence?.count ??
        1
    )
  );

  // field ids
  const uid = useId();
  const id = {
    title: `${uid}-title`,
    start: `${uid}-start`,
    end: `${uid}-end`,
    prio: `${uid}-prio`,
    status: `${uid}-status`,
    assignee: `${uid}-assignee`,
    parent: `${uid}-parent`,
    tag: `${uid}-tag`,
    desc: `${uid}-desc`,
    project: `${uid}-project`,
  };

  /* Load pickers from DB */
  useEffect(() => {
    let alive = true;
    async function run() {
      const [usersRes, statusRes, prioRes] = await Promise.all([
        supabase.from("users").select("id,email,roles(name)"),
        supabase.from("status").select("id,status"),
        supabase.from("priority").select("id").order("id", { ascending: true }),
      ]);

      if (!alive) return;

      setUsers((usersRes.data ?? []) as any[]);
      setStatusOpts((statusRes.data ?? []).map((s: any) => ({ id: s.id, label: s.status })));
      setPrioOpts((prioRes.data ?? []).map((p: any) => ({ id: p.id, label: `P${p.id}` })));

      // default values if empty
      if (!statusId && (statusRes.data ?? []).length) setStatusId((statusRes.data as any[])[0].id);
      if (!priorityId && (prioRes.data ?? []).length) setPriorityId((prioRes.data as any[])[0].id);

      // Fetch user's assigned projects
      if (currentUserId) {
        fetch(`/api/projects/user/${currentUserId}`)
          .then((res) => res.json())
          .then((result) => {
            if (alive && result.ok) setProjects(result.data ?? []);
          })
          .catch((err) => console.error("[TaskForm] Failed to fetch projects:", err));
      }

      // Fetch available parent tasks (tasks without a parent task)
      // Filter by accessible user IDs to match dashboard visibility
      let tasksQuery = supabase
        .from("tasks")
        .select("id, title, parent_task_id, start_date, end_date, owned_by")
        .is("parent_task_id", null);

      if (accessibleUserIds && accessibleUserIds.length > 0) {
        tasksQuery = tasksQuery.in("owned_by", accessibleUserIds);
      }

      const tasksRes = await tasksQuery.order("title", { ascending: true });

      if (alive && tasksRes.data) {
        const currentTaskId = initial?.id ? Number(initial.id) : null;
        const filtered = tasksRes.data.filter((t: any) => t.id !== currentTaskId);
        setAvailableParentTasks(filtered);
      }

      // ▼▼ NEW: fetch tag options from task_tag
      const { data: tagRows, error: tagListErr } = await supabase
        .from("task_tag")
        .select("id,name")
        .order("name", { ascending: true });
      if (tagListErr) {
        console.error("[TaskForm] Failed to fetch tag options:", tagListErr);
      } else if (alive) {
        setTagOptions(tagRows ?? []);
      }
    }
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, accessibleUserIds]);

  /**
   * Always hydrate latest DB values when editing (including recurrence columns).
   */
  useEffect(() => {
    if (mode !== "edit") return;
    const taskId = Number(initial?.id);
    if (!taskId) return;

    let alive = true;
    async function hydrate() {
      setHydrating(true);
      try {
        // 1) task core row + recurrence columns
        const { data: tRows, error: tErr } = await supabase
          .from("tasks")
          .select(
            "id,title,description,start_date,end_date,priority_id,status_id,created_by,owned_by,parent_task_id,project_id,is_recurring,interval_days,num_of_recur"
          )
          .eq("id", taskId)
          .limit(1);

        if (tErr) throw tErr;
        const t = (tRows && tRows[0]) || null;
        if (!t) throw new Error("Task not found");

        // 2) collaborators
        const { data: collabRows, error: cErr } = await supabase
          .from("task_collaborator")
          .select("user_id")
          .eq("task_id", taskId);
        if (cErr) throw cErr;

        // 3) tag id then name
        let tagName = "";
        const { data: tagJoin, error: ttErr } = await supabase
          .from("task_tasktag")
          .select("tag_id")
          .eq("task_id", taskId)
          .limit(1);
        if (ttErr) throw ttErr;

        if (tagJoin && tagJoin.length) {
          const tagId = tagJoin[0]?.tag_id;
          if (tagId != null) {
            const { data: tagRow, error: tagErr } = await supabase
              .from("task_tag")
              .select("name")
              .eq("id", tagId)
              .limit(1);
            if (tagErr) throw tagErr;
            tagName = (tagRow && tagRow[0]?.name) || "";
          }
        }

        if (!alive) return;

        // Populate core fields
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setStartDate(t.start_date ?? "");
        setEndDate(t.end_date ?? "");
        setPriorityId(t.priority_id ?? "");
        setStatusId(t.status_id ?? "");
        setOwnedById(t.owned_by ?? undefined);
        setParentTaskId(t.parent_task_id ?? "");
        setProjectId(t.project_id ?? "");
        setCollaboratorIds((collabRows ?? []).map((r: any) => String(r.user_id)));
        setTag(tagName ?? "");

        // ✅ Populate recurrence from DB columns
        setIsRecurring(Boolean(t.is_recurring));
        setRecurrenceIntervalDays(Number(t.interval_days ?? 1));
        setRecurrenceCount(Number(t.num_of_recur ?? 1));

        // Fetch attachment if editing
        const { data: attachmentData } = await supabase
          .from("attachments")
          .select("*")
          .eq("task_id", taskId)
          .maybeSingle();

        if (attachmentData) {
          setCurrentAttachment(attachmentData);
        }

        setError(null);
      } catch (err: any) {
        console.error("[TaskForm] hydrate error:", err);
        if (err?.message) {
          setError("Failed to load latest task data. You can still edit and save.");
        }
      } finally {
        if (alive) setHydrating(false);
      }
    }

    hydrate();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial?.id]);

  // Owner dropdown should list all users in alphabetical order; collaborators should exclude only the owner.
  const ownerOptions = useMemo(() => {
    return [...users].sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();
      return emailA.localeCompare(emailB);
    });
  }, [users]);
  
  const collabOptions = useMemo(() => {
    return users
      .filter((u) => {
        // Exclude only the owner (assignee) from collaborators
        if (u.id === ownedById) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort alphabetically by email for easier finding
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        return emailA.localeCompare(emailB);
      });
  }, [users, ownedById]);

  // If owner changes, auto-remove owner from collaborators (AC-231 guard)
  useEffect(() => {
    if (!ownedById) return;
    setCollaboratorIds((prev) => prev.filter((id) => id !== ownedById));
  }, [ownedById]);

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!startDate || !endDate) return "Start date and End date are required.";
    if (new Date(startDate) > new Date(endDate)) return "Start must be before or equal to End.";
    if (!ownedById) return "Assignee (Owned By) is required.";
    if (!statusId) return "Status is required.";
    if (!priorityId) return "Priority is required.";

    if (typeof parentTaskId === "number") {
      const parentTask = availableParentTasks.find((t) => t.id === parentTaskId);
      if (parentTask) {
        const taskStart = new Date(startDate);
        const taskEnd = new Date(endDate);
        const parentStart = new Date(parentTask.start_date);
        const parentEnd = new Date(parentTask.end_date);

        if (taskStart < parentStart) return "Subtask start date cannot be earlier than parent task start date.";
        if (taskEnd > parentEnd) return "Subtask end date cannot be later than parent task end date.";
      }
    }

    // 🔁 Recurrence-specific validation
    if (isRecurring && !endDate) return "End date is required when enabling recurrence.";
    if (isRecurring) {
      if (!recurrenceIntervalDays || recurrenceIntervalDays <= 0) return "Recurrence interval (days) must be > 0.";
      if (!recurrenceCount || recurrenceCount <= 0) return "Repeat count must be > 0.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const validCollaboratorIds = collaboratorIds.filter((id) => {
        const isValid = uuidPattern.test(id);
        if (!isValid) console.warn("Invalid UUID in collaborators:", id);
        return isValid;
      });

      if (validCollaboratorIds.length + 1 > MAX_TOTAL_ASSIGNEES) {
        setError(`A task can have at most ${MAX_TOTAL_ASSIGNEES} people assigned, including the owner.`);
        setBusy(false);
        return;
      }

      const payload: any = {
        title,
        description,
        status_id: Number(statusId),
        priority_id: Number(priorityId),
        start_date: startDate,
        end_date: endDate,
        created_by: currentUserId || ownedById, // fallback
        owned_by: ownedById!,
        parent_task_id: parentTaskId === "" ? null : Number(parentTaskId),
        project_id: projectId === "" ? null : Number(projectId),
        assignee_ids: validCollaboratorIds,
        tags: tag ? [tag] : [],
      };

      // 🔁 Include recurrence in payload
      if (isRecurring) {
        payload.recurrence = {
          isRecurring: true,
          intervalDays: Number(recurrenceIntervalDays),
          count: Number(recurrenceCount),
        };
        payload.is_recurring = true;

        // Only send numeric columns when recurrence is enabled
        payload.interval_days = Number(recurrenceIntervalDays);
        payload.num_of_recur = Number(recurrenceCount);
      } else {
        // Not recurring: don't send the numeric fields at all (prevents Zod "expected number, received null")
        payload.recurrence = { isRecurring: false };
        payload.is_recurring = false;
        // NOTE: intentionally NOT setting interval_days / num_of_recur here
      }

      const data =
        mode === "create"
          ? await createTaskAPI(payload)
          : await updateTaskAPI(Number(initial?.id), payload);

      const savedTaskId = (Array.isArray(data) ? data[0]?.id : data?.id) ?? initial?.id;

      // Delete attachment if marked for deletion
      if (attachmentToDelete && savedTaskId) {
        try {
          const response = await fetch(`/api/tasks/${savedTaskId}/attachments?attachmentId=${attachmentToDelete}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete attachment');
          }

          console.log('Attachment deleted successfully');
          setCurrentAttachment(null);
          setAttachmentToDelete(null);
        } catch (attachmentError: any) {
          console.error('Failed to delete attachment:', attachmentError);
          setError(`Task saved, but attachment deletion failed: ${attachmentError.message}`);
          setBusy(false);
          return;
        }
      }

      // Upload attachment if file was selected
      if (selectedFile && savedTaskId) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          if (currentUserId) {
            formData.append('uploaded_by', currentUserId);
          }

          const response = await fetch(`/api/tasks/${savedTaskId}/attachments`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to upload attachment');
          }

          // Successfully uploaded
          console.log('Attachment uploaded successfully');
        } catch (attachmentError: any) {
          console.error('Failed to upload attachment:', attachmentError);
          // Don't fail the entire task creation/update just because attachment failed
          setError(`Task saved, but attachment upload failed: ${attachmentError.message}`);
          setBusy(false);
          return; // Don't call onSaved yet so user can retry
        }
      }

      if (savedTaskId) notifyTaskSync(savedTaskId as any);

      onSaved(data);
    } catch (err: any) {
      console.error("Error saving task:", err);
      setError(err?.message || "Failed to save task.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCollaborator(x: string) {
    setCollaboratorIds((prev) => {
      const exists = prev.includes(x);
      const wasInitiallyAdded = initialCollaboratorIds.includes(x);

      if (exists) {
        // Trying to remove
        // Staff cannot remove existing collaborators in edit mode
        if (!canRemoveCollaborators && mode === "edit" && wasInitiallyAdded) {
          setError("Only managers and admins can remove existing collaborators.");
          // Auto-clear error after 3 seconds
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        // Clear any existing error when successfully removing
        setError(null);
        return prev.filter((i) => i !== x);
      }

      // Trying to add
      if (prev.length >= MAX_COLLABORATORS) {
        setError(`You can add up to ${MAX_COLLABORATORS} collaborators in addition to the owner.`);
        // Auto-clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
        return prev;
      }
      // Clear any existing error when successfully adding
      setError(null);
      return [...prev, x];
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message container - only shows when there's an error */}
      {(error || hydrating) && (
        <div
          className={`p-3 rounded-md ${
            hydrating ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-300"
          }`}
        >
          {hydrating ? (
            <p className="text-sm text-blue-700">Loading latest task data…</p>
          ) : (
            <p className="text-sm font-semibold text-red-700">{error}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor={id.title} className="block text-sm font-medium">
          Title *
        </label>
        <input
          id={id.title}
          className="mt-1 w-full rounded border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.start} className="block text-sm font-medium">
            Start Date *
          </label>
          <input
            id={id.start}
            type="date"
            className="mt-1 w-full rounded border p-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={id.end} className="block text-sm font-medium">
            End Date *
          </label>
          <input
            id={id.end}
            type="date"
            className="mt-1 w-full rounded border p-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* 🔁 Recurrence UI (appears when End Date is set) */}
        {Boolean(endDate) && (
          <div className="sm:col-span-2 border rounded p-3 mt-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="rounded border"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring task
            </label>

            {isRecurring && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm">Repeat every (days) *</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border p-2"
                    value={recurrenceIntervalDays}
                    onChange={(e) => setRecurrenceIntervalDays(Number(e.target.value))}
                    placeholder="e.g., 7"
                  />
                </div>
                <div>
                  <label className="block text-sm">Number of occurrences *</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border p-2"
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="text-xs text-gray-500 self-end">
                  New task is created only when the current one is completed. Overdue completion
                  uses the previous due date to compute the next due date.
                </div>
              </div>
            )}
          </div>
        )}
        {!Boolean(endDate) && (
          <div className="sm:col-span-2 text-xs text-gray-500">Set an End Date to enable recurrence.</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.prio} className="block text-sm font-medium">
            Priority *
          </label>
          <select
            id={id.prio}
            className="mt-1 w-full rounded border p-2"
            value={priorityId}
            onChange={(e) => setPriorityId(Number(e.target.value))}
          >
            {prioOpts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={id.status} className="block text-sm font-medium">
            Status *
          </label>
          <select
            id={id.status}
            className="mt-1 w-full rounded border p-2"
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {statusOpts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={id.project} className="block text-sm font-medium">
          Project {projects.length > 0 && `(${projects.length} available)`}
        </label>
        <select
          id={id.project}
          className="mt-1 w-full rounded border p-2"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">None (No Project)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={id.assignee} className="block text-sm font-medium">
          Assignee (Owned By) *
        </label>
        <select
          id={id.assignee}
          className={`mt-1 w-full rounded border p-2 ${!canEditOwner ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
          value={ownedById ?? ""}
          onChange={(e) => setOwnedById(e.target.value)}
          disabled={!canEditOwner}
          required
        >
          <option value="" disabled>
            Select user
          </option>
          {ownerOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email || u.id}
            </option>
          ))}
        </select>
        {!canEditOwner && (
          <p className="mt-1 text-xs text-gray-500">Only managers and admins can change the task owner.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Collaborators</label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {collabOptions.map((u) => {
            const isChecked = collaboratorIds.includes(u.id);
            const wasInitiallyAdded = initialCollaboratorIds.includes(u.id);
            // Staff cannot remove existing collaborators in edit mode, but can add/remove new ones
            const isDisabledForRemoval = !canRemoveCollaborators && mode === "edit" && wasInitiallyAdded && isChecked;

            return (
              <label
                key={u.id}
                className={`flex items-center gap-2 rounded border p-2 ${
                  isChecked ? "bg-gray-50" : ""
                } ${isDisabledForRemoval ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                title={isDisabledForRemoval ? "Only managers and admins can remove existing collaborators" : ""}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCollaborator(u.id)}
                  disabled={isDisabledForRemoval}
                  className={isDisabledForRemoval ? "cursor-not-allowed" : "cursor-pointer"}
                />
                <span className="text-sm break-all overflow-hidden" title={u.email || u.id}>{u.email || u.id}</span>
              </label>
            );
          })}
        </div>
        {!canRemoveCollaborators && mode === "edit" && initialCollaboratorIds.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Only managers and admins can remove existing collaborators. You can still add new ones.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.parent} className="block text-sm font-medium">
            Parent Task
          </label>
          <select
            id={id.parent}
            className="mt-1 w-full rounded border p-2"
            value={parentTaskId}
            onChange={(e) => {
              const v = e.target.value;
              setParentTaskId(v === "" ? "" : Number(v));
            }}
          >
            <option value="">None (No Parent Task)</option>
            {availableParentTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} (ID: {task.id})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Only tasks without a parent can be selected as parent tasks</p>
        </div>

        {/* ▼▼ UPDATED: Tag dropdown instead of free text input */}
        <div>
          <label htmlFor={id.tag} className="block text-sm font-medium">
            Tag (single)
          </label>
          <select
            id={id.tag}
            className="mt-1 w-full rounded border p-2 bg-white"
            value={tag ?? ""}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">— Select a tag —</option>
            {tagOptions.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={id.desc} className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id={id.desc}
          className="mt-1 w-full rounded border p-2"
          rows={4}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Attachment Upload - Show for both create and edit modes with deferred upload */}
      <AttachmentUpload
        taskId={mode === "edit" ? Number(initial?.id) : undefined}
        currentAttachment={currentAttachment}
        uploadedBy={currentUserId ?? undefined}
        onAttachmentChange={setCurrentAttachment}
        onFileSelected={setSelectedFile}
        onAttachmentMarkedForDeletion={setAttachmentToDelete}
        disabled={busy}
        mode="deferred"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          {busy ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="rounded border px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={onCancel}
          >
          Cancel
          </button>
        )}
      </div>
    </form>
  );
}
