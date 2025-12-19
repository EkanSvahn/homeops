"use client";

import { useState, useEffect } from "react";
import type { PersonId, Task, Event } from "@/lib/homeops.mock";
import { people } from "@/lib/homeops.mock";
import { parseQuickInput } from "@/lib/textParser";

type ItemType = "task" | "event";
type InputMode = "quick" | "advanced";

type QuickAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Task | Event) => void;
};

const AVAILABLE_TAGS = ["Ta med", "Skola", "Viktigt"];

export function QuickAddModal({ isOpen, onClose, onSave }: QuickAddModalProps) {
  const [mode, setMode] = useState<InputMode>("quick");
  const [quickInput, setQuickInput] = useState("");
  const [parsedData, setParsedData] = useState<{
    personId: Exclude<PersonId, "family">;
    title: string;
    date?: string;
    time?: string;
    type: "task" | "event";
  } | null>(null);

  // Avancerat läge
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("task");
  const [personId, setPersonId] = useState<Exclude<PersonId, "family">>("erik");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState("");

  // Parse quick input när den ändras
  useEffect(() => {
    const parseInput = () => {
      if (mode === "quick" && quickInput.trim()) {
        const parsed = parseQuickInput(quickInput);
        setParsedData(parsed);
      } else {
        setParsedData(null);
      }
    };
    parseInput();
  }, [quickInput, mode]);

  if (!isOpen) return null;

  const handleQuickSubmit = () => {
    if (!parsedData) return;

    // Kombinera datum och tid till ISO string
    let startAtOrDueAt: string | undefined;
    if (parsedData.date && parsedData.time) {
      const [hours, minutes] = parsedData.time.split(":").map(Number);
      const dateObj = new Date(parsedData.date);
      dateObj.setHours(hours, minutes, 0, 0);
      startAtOrDueAt = dateObj.toISOString();
    } else if (parsedData.date) {
      const dateObj = new Date(parsedData.date);
      dateObj.setHours(12, 0, 0, 0);
      startAtOrDueAt = dateObj.toISOString();
    }

    if (parsedData.type === "event") {
      if (!startAtOrDueAt) return;

      const event: Event = {
        id: `e${Date.now()}`,
        title: parsedData.title,
        personId: parsedData.personId,
        startAt: startAtOrDueAt,
      };
      onSave(event);
    } else {
      const task: Task = {
        id: `t${Date.now()}`,
        title: parsedData.title,
        assigneeId: parsedData.personId,
        dueAt: startAtOrDueAt,
        status: "todo",
      };
      onSave(task);
    }

    // Reset
    setQuickInput("");
    setParsedData(null);
    onClose();
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && "preventDefault" in e) {
      e.preventDefault();
    }

    if (!title.trim()) return;

    // För events krävs datum + tid
    if (type === "event") {
      if (!date || !time) {
        alert("Händelse kräver både datum och tid");
        return;
      }
    }

    // Kombinera datum och tid till ISO string
    let startAtOrDueAt: string | undefined;
    if (date && time) {
      const [hours, minutes] = time.split(":").map(Number);
      const dateObj = new Date(date);
      dateObj.setHours(hours, minutes, 0, 0);
      startAtOrDueAt = dateObj.toISOString();
    } else if (date) {
      // Om bara datum finns (för tasks), sätt till middag
      const dateObj = new Date(date);
      dateObj.setHours(12, 0, 0, 0);
      startAtOrDueAt = dateObj.toISOString();
    }
    // Om varken datum eller tid finns, blir startAtOrDueAt undefined (OK för tasks)

    if (type === "event") {
      if (!startAtOrDueAt) return;

      const event: Event = {
        id: `e${Date.now()}`,
        title: title.trim(),
        personId,
        startAt: startAtOrDueAt,
        location: location.trim() || undefined,
      };
      onSave(event);
    } else {
      const task: Task = {
        id: `t${Date.now()}`,
        title: title.trim(),
        assigneeId: personId,
        dueAt: startAtOrDueAt,
        status: "todo",
        tags: tags.length > 0 ? tags : undefined,
      };
      onSave(task);
    }

    // Reset form
    setTitle("");
    setType("task");
    setPersonId("erik");
    setDate("");
    setTime("");
    setTags([]);
    setLocation("");
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Sätt default datum till idag
  const todayDate = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-20 left-0 right-0 z-[60] mx-auto max-w-md rounded-t-3xl bg-white shadow-2xl max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">Snabbt tillägg</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b">
          <button
            onClick={() => setMode("quick")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              mode === "quick"
                ? "border-b-2 border-black text-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Snabb input
          </button>
          <button
            onClick={() => setMode("advanced")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              mode === "advanced"
                ? "border-b-2 border-black text-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Avancerat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === "quick" ? (
            <div className="p-6 space-y-4">
              {/* Quick input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Skriv här (t.ex. &quot;Ludwig tandläkare 15/12 10:30&quot;)
                </label>
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && parsedData) {
                      e.preventDefault();
                      handleQuickSubmit();
                    }
                  }}
                  placeholder="Ludwig tandläkare 15/12 10:30"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  autoFocus
                />
              </div>

              {/* Preview */}
              {parsedData && (
                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Förhandsgranskning
                    </div>
                    <button
                      onClick={() => {
                        // Fyll i advanced-läget med parsade värden
                        setTitle(parsedData.title);
                        setType(parsedData.type);
                        setPersonId(parsedData.personId);
                        setDate(parsedData.date || "");
                        setTime(parsedData.time || "");
                        setMode("advanced");
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                    >
                      Redigera
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Person:</span>
                    <span className="text-sm font-semibold">
                      {people.find((p) => p.id === parsedData.personId)?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Titel:</span>
                    <span className="text-sm font-semibold">
                      {parsedData.title}
                    </span>
                  </div>
                  {parsedData.date && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Datum:</span>
                      <span className="text-sm">
                        {new Date(parsedData.date).toLocaleDateString("sv-SE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  )}
                  {parsedData.time && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Tid:</span>
                      <span className="text-sm">{parsedData.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Typ:</span>
                    <span className="text-sm font-semibold">
                      {parsedData.type === "event" ? "Händelse" : "Uppgift"}
                    </span>
                  </div>
                </div>
              )}

              {!parsedData && quickInput.trim() && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Kunde inte tolka input. Försök med formatet: &quot;Person
                  titel datum tid&quot;
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-6 pb-4">
              {/* Titel */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="T.ex. Ring vårdcentralen"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  required
                  autoFocus
                />
              </div>

              {/* Typ */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Typ *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("task")}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${
                      type === "task"
                        ? "border-black bg-black text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Uppgift
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("event")}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${
                      type === "event"
                        ? "border-black bg-black text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Händelse
                  </button>
                </div>
              </div>

              {/* Person */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Person *
                </label>
                <select
                  value={personId}
                  onChange={(e) =>
                    setPersonId(e.target.value as Exclude<PersonId, "family">)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  required
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Datum */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Datum {type === "event" && "*"}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayDate}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  required={type === "event"}
                />
              </div>

              {/* Tid */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tid {type === "event" && "*"}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  required={type === "event"}
                />
              </div>

              {/* Plats (endast för events) */}
              {type === "event" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Plats
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="T.ex. Skolan"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
              )}

              {/* Taggar (endast för uppgifter) */}
              {type === "task" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Taggar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                          tags.includes(tag)
                            ? "bg-black text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Spara-knapp - alltid synlig längst ner */}
        <div className="border-t px-6 py-4 shrink-0 bg-white">
          {mode === "quick" ? (
            <button
              onClick={handleQuickSubmit}
              disabled={!parsedData}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsedData ? "Spara" : "Skriv något först"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99]"
            >
              Spara
            </button>
          )}
        </div>
      </div>
    </>
  );
}
