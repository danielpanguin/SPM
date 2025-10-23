// lib/tasks.schema.ts
import { z } from "zod";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Optional recurrence payload coming from the UI
const RecurrenceSchema = z.object({
  isRecurring: z.boolean().default(false),
  intervalDays: z.number().int().positive().default(1),
  count: z.number().int().positive().default(1),
});

export const TaskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  project_id: z.number().int().positive().optional().nullable(),
  status_id: z.number().int().positive().optional().nullable(),
  priority_id: z.number().int().positive().optional().nullable(),
  start_date: z.string().regex(YMD).optional().nullable(),
  end_date: z.string().regex(YMD).optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
  owned_by: z.string().uuid().optional().nullable(),
  parent_task_id: z.number().int().positive().optional().nullable(),
  assignee_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string().min(1)).optional(),

  // NEW: backend can accept either the nested object...
  recurrence: RecurrenceSchema.optional(),

  // ...or flat columns (useful for programmatic calls/tests)
  is_recurring: z.boolean().optional(),
  interval_days: z.number().int().positive().optional().nullable(), // ← allow null
  num_of_recur: z.number().int().positive().optional().nullable(), // ← allow null
});

export const TaskUpdateSchema = TaskCreateSchema.partial();
