// src/lib/storage.ts
// Utility för att spara och ladda state från localStorage

import type { Task } from "./homeops.mock";

const STORAGE_KEY = "homeops-tasks";

export function loadTasksFromStorage(): Task[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveTasksToStorage(tasks: Task[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks to localStorage:", error);
  }
}

export function updateTaskInStorage(taskId: string, updates: Partial<Task>) {
  const tasks = loadTasksFromStorage();
  if (!tasks) return;
  
  const updated = tasks.map((t) => 
    t.id === taskId ? { ...t, ...updates } : t
  );
  saveTasksToStorage(updated);
}

