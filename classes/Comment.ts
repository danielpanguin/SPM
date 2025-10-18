import { User } from './User';
import { Task } from './Task';

export class Comment {
  private comment_id: number;
  private description: string;
  private created_on: Date;
  private created_by: User;
  private is_modified?: boolean;
  private modified_on: Date;
  private task: Task;

  constructor(
    comment_id: number,
    description: string,
    created_on: Date,
    created_by: User,
    modified_on: Date,
    task: Task,
    is_modified?: boolean
  ) {
    this.comment_id = comment_id;
    this.description = description;
    this.created_on = created_on;
    this.created_by = created_by;
    this.modified_on = modified_on;
    this.task = task;
    this.is_modified = is_modified;
  }

  // Getters
  getCommentId(): number {
    return this.comment_id;
  }

  getDescription(): string {
    return this.description;
  }

  getCreatedOn(): Date {
    return this.created_on;
  }

  getCreatedBy(): User {
    return this.created_by;
  }

  getIsModified(): boolean | undefined {
    return this.is_modified;
  }

  getModifiedOn(): Date {
    return this.modified_on;
  }

  getTask(): Task {
    return this.task;
  }

  // Setters
  setCommentId(comment_id: number): void {
    this.comment_id = comment_id;
  }

  setDescription(description: string): void {
    this.description = description;
  }

  setCreatedOn(created_on: Date): void {
    this.created_on = created_on;
  }

  setCreatedBy(created_by: User): void {
    this.created_by = created_by;
  }

  setIsModified(is_modified: boolean | undefined): void {
    this.is_modified = is_modified;
  }

  setModifiedOn(modified_on: Date): void {
    this.modified_on = modified_on;
  }

  setTask(task: Task): void {
    this.task = task;
  }
}
