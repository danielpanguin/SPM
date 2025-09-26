import fs from "fs";
import path from "path";
import { Task, UserRef } from "@/types/task";

const DATA_DIR = path.join(process.cwd(), ".data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// ensure store
function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]", "utf-8");
  if (!fs.existsSync(USERS_FILE)) {
    // seed a tiny user directory for demo; hook your real user system here
    const seed = [
      { id: "u-mgr", name: "Morgan Manager", role: "manager", department: "Ops" },
      { id: "u-stf-1", name: "Sam Staff", role: "staff", department: "Ops" },
      { id: "u-stf-2", name: "Casey Staff", role: "staff", department: "Finance" },
      { id: "u-stf-3", name: "Alex Staff", role: "staff", department: "Design" },
      { id: "u-stf-4", name: "Pat Staff", role: "staff", department: "Ops" },
      { id: "u-stf-5", name: "Jamie Staff", role: "staff", department: "Ops" },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}

export function readTasks(): Task[] {
  ensure();
  return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
}
export function writeTasks(tasks: Task[]) {
  ensure();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}
export function readUsers(): UserRef[] {
  ensure();
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}
export function findUserById(id?: string | null): UserRef | undefined {
  if (!id) return undefined;
  return readUsers().find(u => u.id === id);
}
