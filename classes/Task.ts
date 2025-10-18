import { Status } from './Status';
import { User } from './User';

export class Task {
  private task_id: number;
  private title: string;
  private description: string;
  private priority: number;
  private status: Status;
  private start_date: Date;
  private end_date: Date;
  private is_overdue?: boolean;
  private is_archived?: boolean;
  private is_parent?: boolean;
  private parent_task: Task | null;
  private collaborators: User[];
  private owner: User;
  private creator: User;

  constructor(
    task_id: number,
    title: string,
    description: string,
    priority: number,
    status: Status,
    start_date: Date,
    end_date: Date,
    owner: User,
    creator: User,
    parent_task: Task | null = null,
    collaborators: User[] = [],
    is_overdue?: boolean,
    is_archived?: boolean,
    is_parent?: boolean
  ) {
    this.task_id = task_id;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.status = status;
    this.start_date = start_date;
    this.end_date = end_date;
    this.owner = owner;
    this.creator = creator;
    this.parent_task = parent_task;
    this.collaborators = collaborators;
    this.is_overdue = is_overdue;
    this.is_archived = is_archived;
    this.is_parent = is_parent;
  }

  // Getters
  getTaskId(): number {
    return this.task_id;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getPriority(): number {
    return this.priority;
  }

  getStatus(): Status {
    return this.status;
  }

  getStartDate(): Date {
    return this.start_date;
  }

  getEndDate(): Date {
    return this.end_date;
  }

  getIsOverdue(): boolean | undefined {
    return this.is_overdue;
  }

  getIsArchived(): boolean | undefined {
    return this.is_archived;
  }

  getIsParent(): boolean | undefined {
    return this.is_parent;
  }

  getParentTask(): Task | null {
    return this.parent_task;
  }

  getCollaborators(): User[] {
    return this.collaborators;
  }

  getOwner(): User {
    return this.owner;
  }

  getCreator(): User {
    return this.creator;
  }

  // Setters
  setTaskId(task_id: number): void {
    this.task_id = task_id;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  setDescription(description: string): void {
    this.description = description;
  }

  setPriority(priority: number): void {
    this.priority = priority;
  }

  setStatus(status: Status): void {
    this.status = status;
  }

  setStartDate(start_date: Date): void {
    this.start_date = start_date;
  }

  setEndDate(end_date: Date): void {
    this.end_date = end_date;
  }

  setIsOverdue(is_overdue: boolean | undefined): void {
    this.is_overdue = is_overdue;
  }

  setIsArchived(is_archived: boolean | undefined): void {
    this.is_archived = is_archived;
  }

  setIsParent(is_parent: boolean | undefined): void {
    this.is_parent = is_parent;
  }

  setParentTask(parent_task: Task | null): void {
    this.parent_task = parent_task;
  }

  setCollaborators(collaborators: User[]): void {
    this.collaborators = collaborators;
  }

  setOwner(owner: User): void {
    this.owner = owner;
  }

  setCreator(creator: User): void {
    this.creator = creator;
  }
}
