// src/lib/textParser.ts
// Smart text parser för Quick Add v2

import type { PersonId } from "./homeops.mock";
import { people } from "./homeops.mock";

type ParsedInput = {
  personId: Exclude<PersonId, "family">;
  title: string;
  date?: string; // ISO string
  time?: string; // HH:MM format
  type: "task" | "event"; // Gissa baserat på om det finns tid
};

// Matcha personnamn
function findPerson(text: string): Exclude<PersonId, "family"> | null {
  const lowerText = text.toLowerCase();
  for (const person of people) {
    if (lowerText.includes(person.name.toLowerCase())) {
      return person.id;
    }
  }
  return null;
}

// Matcha datum: 15/12, 15-12, 15 dec, imorgon, idag, etc.
function parseDate(text: string): string | null {
  const lowerText = text.toLowerCase();
  const now = new Date();
  
  // Relativa datum
  if (lowerText.includes("imorgon") || lowerText.includes("imorron")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
  if (lowerText.includes("idag") || lowerText.includes("i dag")) {
    return now.toISOString().split("T")[0];
  }
  
  // Datumformat: DD/MM, DD-MM, DD.MM
  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})/, // 15/12, 15-12, 15.12
    /(\d{1,2})\s+(dec|jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov)/i, // 15 dec
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[3]) {
        // Månadsnamn
        const day = parseInt(match[1]);
        const monthNames = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
        const month = monthNames.findIndex(m => m.toLowerCase() === match[3].toLowerCase());
        if (month !== -1) {
          const year = now.getFullYear();
          const date = new Date(year, month, day);
          return date.toISOString().split("T")[0];
        }
      } else {
        // DD/MM format
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // Månader är 0-indexerade
        const year = now.getFullYear();
        const date = new Date(year, month, day);
        // Om datumet är i det förflutna, anta nästa år
        if (date < now) {
          date.setFullYear(year + 1);
        }
        return date.toISOString().split("T")[0];
      }
    }
  }
  
  return null;
}

// Matcha tid: 10:30, 1030, 10.30
function parseTime(text: string): string | null {
  const timePatterns = [
    /(\d{1,2}):(\d{2})/, // 10:30
    /(\d{1,2})\.(\d{2})/, // 10.30
    /(\d{3,4})\b/, // 1030 (4 siffror)
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours: number;
      let minutes: number;
      
      if (match[2]) {
        // Format med separator
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
      } else {
        // Format utan separator (1030)
        const timeStr = match[1];
        if (timeStr.length === 3) {
          hours = parseInt(timeStr[0]);
          minutes = parseInt(timeStr.slice(1));
        } else {
          hours = parseInt(timeStr.slice(0, 2));
          minutes = parseInt(timeStr.slice(2));
        }
      }
      
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }
  }
  
  return null;
}

// Huvudparser-funktion
export function parseQuickInput(text: string): ParsedInput | null {
  if (!text.trim()) return null;
  
  const personId = findPerson(text) || "erik"; // Default till Erik
  const date = parseDate(text);
  const time = parseTime(text);
  
  // Ta bort person, datum och tid från texten för att få titel
  let title = text;
  
  // Ta bort personnamn
  for (const person of people) {
    title = title.replace(new RegExp(person.name, "gi"), "");
  }
  
  // Ta bort datum
  if (date) {
    title = title.replace(/(\d{1,2})[\/\-\.](\d{1,2})/g, "");
    title = title.replace(/(\d{1,2})\s+(dec|jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov)/gi, "");
    title = title.replace(/imorgon|imorron|idag|i dag/gi, "");
  }
  
  // Ta bort tid
  if (time) {
    title = title.replace(/(\d{1,2}):(\d{2})/g, "");
    title = title.replace(/(\d{1,2})\.(\d{2})/g, "");
    title = title.replace(/(\d{3,4})\b/g, "");
  }
  
  // Rensa upp titel
  title = title.trim().replace(/\s+/g, " ");
  
  if (!title) {
    return null; // Ingen titel kvar
  }
  
  // Gissa typ: om det finns tid, är det troligen en event
  const type: "task" | "event" = time ? "event" : "task";
  
  return {
    personId,
    title,
    date: date || undefined,
    time: time || undefined,
    type,
  };
}

