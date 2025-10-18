import { Status } from './Status';
import { User } from './User';

export interface Filter {
  task_title: string;
  task_priority: number;
  task_status: Status;
  start_date: Date;
  end_date: Date;
  task_collaborators: User[];
  task_owner: User;
}
