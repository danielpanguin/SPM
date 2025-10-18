import { User } from './User';

export class Department {
  private department_id: number;
  private department_name: string;
  private manager: User;
  private staffs: User[];

  constructor(
    department_id: number,
    department_name: string,
    manager: User,
    staffs: User[] = []
  ) {
    this.department_id = department_id;
    this.department_name = department_name;
    this.manager = manager;
    this.staffs = staffs;
  }

  // Getters
  getDepartmentId(): number {
    return this.department_id;
  }

  getDepartmentName(): string {
    return this.department_name;
  }

  getManager(): User {
    return this.manager;
  }

  getStaffs(): User[] {
    return this.staffs;
  }

  // Setters
  setDepartmentId(department_id: number): void {
    this.department_id = department_id;
  }

  setDepartmentName(department_name: string): void {
    this.department_name = department_name;
  }

  setManager(manager: User): void {
    this.manager = manager;
  }

  setStaffs(staffs: User[]): void {
    this.staffs = staffs;
  }
}
