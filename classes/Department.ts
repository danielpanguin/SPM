import { User } from './User';
import { supabase } from '@/lib/supabaseClient';

export class Department {
  private department_id: number;
  private department_name: string;
  private manager: User;
  private staffs: User[];
  private loaded: boolean = false;
  private manager_id?: string;

  constructor(
    department_id: number,
    department_name?: string,
    manager?: User,
    staffs: User[] = [],
    manager_id?: string
  ) {
    this.department_id = department_id;
    this.department_name = department_name || '';
    this.manager = manager || new User('');
    this.staffs = staffs;
    this.manager_id = manager_id;

    // If only ID provided, we'll need to load from DB
    if (!department_name) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', this.department_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading department from database:', error);
      return false;
    }

    if (!data) {
      console.error('Department not found in database');
      return false;
    }

    // Update instance with database values
    this.department_name = data.name || '';
    this.manager_id = data.manager_id;

    // Load manager
    if (data.manager_id) {
      this.manager = await User.loadById(data.manager_id) || new User('');
    }

    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: number): Promise<Department | null> {
    const department = new Department(id);
    const success = await department.init();
    return success ? department : null;
  }

  // Static method to load all departments
  static async loadAll(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return Promise.all(
      data.map(async d => {
        const manager = d.manager_id ? await User.loadById(d.manager_id) : null;

        return new Department(
          d.id,
          d.name,
          manager || undefined,
          [],
          d.manager_id
        );
      })
    );
  }

  // Load staff members from database
  private async loadStaffs(): Promise<void> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', this.department_id);

    if (error || !data) {
      console.error('Error fetching department staff:', error);
      return;
    }

    const users = await Promise.all(
      data.map(u => User.loadById(u.id))
    );
    this.staffs = users.filter((u): u is User => u !== null);
  }

  // Getters - automatically load from DB if not loaded
  async getDepartmentId(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.department_id;
  }

  async getDepartmentName(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.department_name;
  }

  async getManager(): Promise<User> {
    if (!this.loaded) await this.init();
    return this.manager;
  }

  async getStaffs(): Promise<User[]> {
    if (!this.loaded) await this.init();
    if (this.staffs.length === 0) {
      await this.loadStaffs();
    }
    return this.staffs;
  }

  // Synchronous getters (without DB check) - use with caution
  getDepartmentIdSync(): number {
    return this.department_id;
  }

  getDepartmentNameSync(): string {
    return this.department_name;
  }

  getManagerSync(): User {
    return this.manager;
  }

  getStaffsSync(): User[] {
    return this.staffs;
  }

  // Setters - update in database and in-memory
  async setDepartmentId(department_id: number): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.department_id = department_id;
    return true;
  }

  async setDepartmentName(department_name: string): Promise<boolean> {
    const { error } = await supabase
      .from('departments')
      .update({ name: department_name })
      .eq('id', this.department_id);

    if (error) {
      console.error('Error updating department name:', error);
      return false;
    }

    this.department_name = department_name;
    return true;
  }

  async setManager(manager: User): Promise<boolean> {
    const manager_id = manager.getUserIdSync();

    const { error } = await supabase
      .from('departments')
      .update({ manager_id })
      .eq('id', this.department_id);

    if (error) {
      console.error('Error updating department manager:', error);
      return false;
    }

    this.manager = manager;
    this.manager_id = manager_id;
    return true;
  }

  // Add a staff member to the department
  async addStaff(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ department_id: this.department_id })
      .eq('id', userId);

    if (error) {
      console.error('Error adding staff to department:', error);
      return false;
    }

    // Refresh staff list from DB
    await this.loadStaffs();
    return true;
  }

  // Remove a staff member from the department
  async removeStaff(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ department_id: null })
      .eq('id', userId)
      .eq('department_id', this.department_id);

    if (error) {
      console.error('Error removing staff from department:', error);
      return false;
    }

    // Refresh staff list from DB
    await this.loadStaffs();
    return true;
  }

  // Save entire department to database (for new departments)
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: this.department_name,
        manager_id: this.manager.getUserIdSync(),
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating department:', error);
      return false;
    }

    this.department_id = data.id;
    this.loaded = true;
    return true;
  }

  // Delete department from database
  async deleteFromDB(): Promise<boolean> {
    // First, remove department_id from all users in this department
    await supabase
      .from('users')
      .update({ department_id: null })
      .eq('department_id', this.department_id);

    // Then delete the department
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', this.department_id);

    if (error) {
      console.error('Error deleting department:', error);
      return false;
    }

    return true;
  }

  // Check if department data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
