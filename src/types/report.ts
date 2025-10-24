export type ReportViewType = 'weekly' | 'monthly' | 'all';
export type TaskFrequencyFilter = 'all' | 'weekly' | 'monthly';

export interface CompletionReportFilters {
  viewType: ReportViewType;
  taskFrequency: TaskFrequencyFilter;
  // Admin filters
  departmentFilter?: 'all' | 'my-department' | string; // department ID
  projectFilter?: 'all' | 'my-projects' | string; // project ID
  userFilter?: 'all' | string; // user ID
  // Manager filters (subset of admin)
  managerProjectFilter?: 'all' | 'my-projects' | string;
  managerUserFilter?: 'all' | 'my-team' | string;
}

export interface CompletionReportData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  completionRate: number;
  tasks: CompletionTaskSummary[];
}

export interface CompletionTaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  completedDate?: string;
  project?: string;
  department?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}
