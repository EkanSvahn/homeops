// src/lib/storage.ts
// Utility för att spara och ladda state från localStorage

import type { Task, Event } from "./homeops.mock";
import type { ShoppingDocument, Receipt } from "./shopping.types";

const TASKS_STORAGE_KEY = "homeops-tasks";
const EVENTS_STORAGE_KEY = "homeops-events";
const SHOPPING_DOCUMENTS_KEY = "homeops-shopping-documents";
const RECEIPTS_KEY = "homeops-receipts";

export function loadTasksFromStorage(): Task[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveTasksToStorage(tasks: Task[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks to localStorage:", error);
  }
}

export function loadEventsFromStorage(): Event[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveEventsToStorage(events: Event[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error("Failed to save events to localStorage:", error);
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

// Shopping Documents
export function loadShoppingDocumentsFromStorage(): ShoppingDocument[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SHOPPING_DOCUMENTS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveShoppingDocumentsToStorage(documents: ShoppingDocument[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOPPING_DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error("Failed to save shopping documents to localStorage:", error);
  }
}

// Receipts
export function loadReceiptsFromStorage(): Receipt[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(RECEIPTS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveReceiptsToStorage(receipts: Receipt[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  } catch (error) {
    console.error("Failed to save receipts to localStorage:", error);
  }
}

