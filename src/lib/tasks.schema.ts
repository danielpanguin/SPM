// lib/tasks.schema.ts
import { z } from "zod";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

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
});

export const TaskUpdateSchema = TaskCreateSchema.partial();
