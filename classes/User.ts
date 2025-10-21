import { Role } from './Role';
import { supabase } from '@/lib/supabaseClient';

export class User {
  private user_id: string;
  private user_name: string;
  private user_email: string;
  private role: Role;
  private role_id?: number; // FK to roles table
  private loaded: boolean = false;

  // Constructor can either create a new user or load from database
  constructor(user_id: string, user_name?: string, user_email?: string, role?: Role, role_id?: number) {
    this.user_id = user_id;
    this.user_name = user_name || '';
    this.user_email = user_email || '';
    this.role = role || Role.Staff;
    this.role_id = role_id;

    // If only ID provided, we'll need to load from DB
    if (!user_email) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role_id')
      .eq('id', this.user_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading user from database:', error);
      return false;
    }

    if (!data) {
      console.error('User not found in database');
      return false;
    }

    // Update instance with database values
    this.user_email = data.email;
    this.user_name = data.username || '';
    this.role_id = data.role_id;

    // Note: You may want to load the actual Role enum from roles table
    // For now, keeping default role

    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: string): Promise<User | null> {
    const user = new User(id);
    const success = await user.init();
    return success ? user : null;
  }

  // Static factory method to load by email
  static async loadByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role_id')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return new User(data.id, data.username || '', data.email, Role.Staff, data.role_id);
  }

  // Static method to fetch all users
  static async loadAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role_id')
      .order('email', { ascending: true });

    if (error || !data) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data.map(u => new User(u.id, u.username || '', u.email, Role.Staff, u.role_id));
  }

  // Getters - automatically load from DB if not loaded
  async getUserId(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.user_id;
  }

  async getUserName(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.user_name;
  }

  async getUserEmail(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.user_email;
  }

  async getRole(): Promise<Role> {
    if (!this.loaded) await this.init();
    return this.role;
  }

  async getRoleId(): Promise<number | undefined> {
    if (!this.loaded) await this.init();
    return this.role_id;
  }

  // Synchronous getters (without DB check) - use with caution
  getUserIdSync(): string {
    return this.user_id;
  }

  getUserNameSync(): string {
    return this.user_name;
  }

  getUserEmailSync(): string {
    return this.user_email;
  }

  getRoleSync(): Role {
    return this.role;
  }

  getRoleIdSync(): number | undefined {
    return this.role_id;
  }

  // Setters - update in database and in-memory
  async setUserId(user_id: string): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.user_id = user_id;
    return true;
  }

  async setUserName(user_name: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ username: user_name })
      .eq('id', this.user_id);

    if (error) {
      console.error('Error updating user name:', error);
      return false;
    }

    this.user_name = user_name;
    return true;
  }

  async setUserEmail(user_email: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ email: user_email })
      .eq('id', this.user_id);

    if (error) {
      console.error('Error updating user email:', error);
      return false;
    }

    this.user_email = user_email;
    return true;
  }

  async setRole(role: Role): Promise<boolean> {
    // Note: This only updates in-memory
    // To update in database, use setRoleId()
    this.role = role;
    return true;
  }

  async setRoleId(role_id: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ role_id: role_id })
      .eq('id', this.user_id);

    if (error) {
      console.error('Error updating user role:', error);
      return false;
    }

    this.role_id = role_id;
    return true;
  }

  // Save new user to database
  async saveToDB(): Promise<boolean> {
    const insertData: any = {
      id: this.user_id,
      email: this.user_email
    };

    if (this.user_name) {
      insertData.username = this.user_name;
    }

    if (this.role_id) {
      insertData.role_id = this.role_id;
    }

    const { error } = await supabase
      .from('users')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return false;
    }

    this.loaded = true;
    return true;
  }

  // Delete user from database
  async deleteFromDB(): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', this.user_id);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
  }

  // Check if user data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
