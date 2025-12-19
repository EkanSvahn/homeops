"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PersonId, Task, Event } from "@/lib/homeops.mock";
import {
  people,
  tasks as initialTasks,
  events as initialEvents,
} from "@/lib/homeops.mock";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  loadEventsFromStorage,
  saveEventsToStorage,
} from "@/lib/storage";
import { QuickAddModal } from "./QuickAddModal";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isTomorrow(date: Date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

function formatWeekdayDate(d: Date) {
  return d.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function timeHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Person-färger för badges
const PERSON_COLORS: Record<
  Exclude<PersonId, "family">,
  { bg: string; text: string; border: string }
> = {
  erik: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  sofie: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  ludwig: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  alwa: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
};

// Hjälpfunktion för att få tidsindikator
function getTimeIndicator(iso: string): string {
  const now = new Date();
  const eventTime = new Date(iso);
  const diffMs = eventTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs < 0) {
    const hoursAgo = Math.abs(diffHours);
    if (hoursAgo === 0) return "Nu";
    if (hoursAgo === 1) return "För 1 timme";
    return `För ${hoursAgo} timmar`;
  }

  if (diffHours === 0) {
    if (diffMins <= 5) return "Nu";
    return `Om ${diffMins} min`;
  }
  if (diffHours === 1) return "Om 1 timme";
  return `Om ${diffHours} timmar`;
}

function selectPersonFromQuery(value: string | null): PersonId {
  const allowed: PersonId[] = ["family", "erik", "sofie", "ludwig", "alwa"];
  if (!value) return "family";
  return allowed.includes(value as PersonId) ? (value as PersonId) : "family";
}

type TodayModel = {
  selected: PersonId;
  eventsToday: Event[];
  eventsTomorrow: Event[];
  tasksOpen: Task[];
  tasksDoneToday: Task[];
};

export default function TodayScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = selectPersonFromQuery(sp.get("person"));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [completedPanelOpen, setCompletedPanelOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Ladda tasks och events från localStorage vid mount
  useEffect(() => {
    const loadData = () => {
      const storedTasks = loadTasksFromStorage();
      if (storedTasks && storedTasks.length > 0) {
        setTasks(storedTasks);
      } else {
        // Spara initial tasks första gången
        saveTasksToStorage(initialTasks);
      }

      const storedEvents = loadEventsFromStorage();
      if (storedEvents && storedEvents.length > 0) {
        setEvents(storedEvents);
      } else {
        // Spara initial events första gången
        saveEventsToStorage(initialEvents);
      }
    };

    loadData();
  }, []);

  const model: TodayModel = useMemo(() => {
    const now = new Date();

    const isToday = (iso?: string) => {
      if (!iso) return false;
      return isSameDay(new Date(iso), now);
    };

    const isTomorrowDate = (iso?: string) => {
      if (!iso) return false;
      return isTomorrow(new Date(iso));
    };

    const isOverdue = (t: Task) => {
      if (!t.dueAt) return false;
      const due = new Date(t.dueAt);
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      return due < startOfToday;
    };

    const isDueToday = (t: Task) => {
      if (!t.dueAt) return false;
      return isSameDay(new Date(t.dueAt), now);
    };

    const bySelectedPerson = <
      T extends { personId?: string; assigneeId?: string }
    >(
      item: T
    ) => {
      if (selected === "family") return true;
      return item.personId === selected || item.assigneeId === selected;
    };

    // Events: idag och imorgon
    const eventsToday = events
      .filter((e) => bySelectedPerson(e) && isToday(e.startAt))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));

    const eventsTomorrow = events
      .filter((e) => bySelectedPerson(e) && isTomorrowDate(e.startAt))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));

    // Tasks: öppna (overdue + today + no date)
    const openTasks = tasks.filter((t) => t.status !== "done");

    const tasksOpen = openTasks
      .filter(
        (t) =>
          bySelectedPerson(t) && (isOverdue(t) || isDueToday(t) || !t.dueAt)
      )
      .sort((a, b) => {
        // Sortering: overdue först, sedan idag med tid, sedan idag utan tid
        const aOverdue = isOverdue(a);
        const bOverdue = isOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        const aHasTime = !!a.dueAt;
        const bHasTime = !!b.dueAt;
        if (aHasTime && !bHasTime) return -1;
        if (!aHasTime && bHasTime) return 1;

        // Båda har tid eller båda saknar tid - sortera på tid
        if (a.dueAt && b.dueAt) {
          return +new Date(a.dueAt) - +new Date(b.dueAt);
        }
        return 0;
      });

    // Tasks: klara idag (eller senaste 24h)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const tasksDoneToday = tasks
      .filter((t) => {
        if (t.status !== "done" || !t.completedAt) return false;
        if (!bySelectedPerson(t)) return false;
        const completed = new Date(t.completedAt);
        return completed >= yesterday; // Senaste 24h
      })
      .sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return +new Date(b.completedAt) - +new Date(a.completedAt); // Nyaste först
      });

    return { selected, eventsToday, eventsTomorrow, tasksOpen, tasksDoneToday };
  }, [selected, tasks, events]);

  const setPerson = (person: PersonId) => {
    const params = new URLSearchParams(sp.toString());
    params.set("person", person);
    router.replace(`/?${params.toString()}`);
  };

  const handleMarkDone = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: "done" as const,
          completedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setTasks(updated);
    saveTasksToStorage(updated);
  };

  const handleToggleEventDone = (eventId: string) => {
    const updated = events.map((e) => {
      if (e.id === eventId) {
        // Växla status: om den är färdig, gör den ofärdig, annars gör den färdig
        if (e.completed) {
          return {
            ...e,
            completed: false,
            completedAt: undefined,
          };
        } else {
          return {
            ...e,
            completed: true,
            completedAt: new Date().toISOString(),
          };
        }
      }
      return e;
    });
    setEvents(updated);
    saveEventsToStorage(updated);
  };

  const handleSave = (item: Task | Event) => {
    if ("assigneeId" in item) {
      // Det är en Task
      const newTasks = [...tasks, item];
      setTasks(newTasks);
      saveTasksToStorage(newTasks);
    } else {
      // Det är en Event
      const newEvents = [...events, item];
      setEvents(newEvents);
      saveEventsToStorage(newEvents);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-40 pt-4">
      {/* Header */}
      <div className="mb-3">
        <div className="text-sm text-slate-500">
          {formatWeekdayDate(new Date())}
        </div>
        <div className="text-2xl font-semibold tracking-tight">Idag</div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <TabButton
          active={model.selected === "family"}
          onClick={() => setPerson("family")}
        >
          Familj
        </TabButton>
        {people.map((p) => (
          <TabButton
            key={p.id}
            active={model.selected === p.id}
            onClick={() => setPerson(p.id)}
          >
            {p.name}
          </TabButton>
        ))}
      </div>

      {/* Always show the 4 sections */}
      <div className="space-y-6">
        {/* Events Today */}
        <SectionTitle title="Händer idag" />
        <CardList>
          {model.eventsToday.length === 0 ? (
            <EmptyState text="Inga händelser idag" />
          ) : (
            model.eventsToday.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onToggleDone={() => handleToggleEventDone(e.id)}
              />
            ))
          )}
        </CardList>

        {/* Events Tomorrow */}
        <SectionTitle title="Händer imorgon" />
        <CardList>
          {model.eventsTomorrow.length === 0 ? (
            <EmptyState text="Inga händelser imorgon" />
          ) : (
            model.eventsTomorrow.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onToggleDone={() => handleToggleEventDone(e.id)}
              />
            ))
          )}
        </CardList>

        {/* Tasks */}
        <SectionTitle title="Uppgifter" subtitle="Förfallet och idag." />
        <CardList>
          {model.tasksOpen.length === 0 ? (
            <EmptyState text="Allt är klart!" />
          ) : (
            model.tasksOpen.map((t) => {
              const now = new Date();
              const isOverdue =
                t.dueAt &&
                new Date(t.dueAt) < new Date(now.setHours(0, 0, 0, 0));
              const isToday = t.dueAt && isSameDay(new Date(t.dueAt), now);
              const isTomorrowTask = t.dueAt && isTomorrow(new Date(t.dueAt));
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  isOverdue={!!isOverdue}
                  isToday={!!isToday}
                  isTomorrow={!!isTomorrowTask}
                  onMarkDone={() => handleMarkDone(t.id)}
                />
              );
            })
          )}
        </CardList>

        {/* Klart Panel */}
        {model.tasksDoneToday.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm">
            <button
              onClick={() => setCompletedPanelOpen(!completedPanelOpen)}
              className="w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">
                  Klart ({model.tasksDoneToday.length})
                </div>
                <div className="text-sm text-slate-500">
                  {completedPanelOpen ? "▼" : "▶"}
                </div>
              </div>
            </button>
            {completedPanelOpen && (
              <div className="border-t px-2 py-2">
                {model.tasksDoneToday.map((t) => (
                  <CompletedTaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick add button */}
      <div className="fixed bottom-28 left-0 right-0 mx-auto w-full max-w-md px-4 z-[60]">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99]"
        >
          + Snabbt tillägg
        </button>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      className={[
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
        "border shadow-sm",
        props.active
          ? "bg-black text-white border-black"
          : "bg-white text-black hover:bg-neutral-50",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="text-base font-semibold">{title}</div>
      {subtitle ? (
        <div className="text-sm text-slate-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

function CardList({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl border bg-white p-2 shadow-sm">
      {children}
    </div>
  );
}

function EventRow({
  event,
  onToggleDone,
}: {
  event: Event;
  onToggleDone: () => void;
}) {
  const isCompleted = event.completed;
  const timeIndicator = getTimeIndicator(event.startAt);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div className="w-12 text-xs font-semibold text-neutral-600">
        {timeHHMM(event.startAt)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`truncate text-sm font-semibold ${
              isCompleted ? "text-slate-400 line-through" : ""
            }`}
          >
            {event.title}
          </div>
          <PersonBadge personId={event.personId} />
        </div>
        <div className="flex items-center gap-2">
          {event.location && (
            <div
              className={`truncate text-xs ${
                isCompleted ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {event.location}
            </div>
          )}
          <span
            className={`text-xs ${
              isCompleted ? "text-slate-300" : "text-slate-400"
            }`}
          >
            {timeIndicator}
          </span>
        </div>
        {isCompleted && event.completedAt && (
          <div className="text-xs text-slate-400 mt-1">
            Genomförd {timeHHMM(event.completedAt)}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {!isCompleted ? (
          <button
            onClick={onToggleDone}
            className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99] transition-all"
          >
            Färdig
          </button>
        ) : (
          <button
            onClick={onToggleDone}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-[0.99] transition-all"
            title="Återställ"
          >
            ✓ Ångra
          </button>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  isOverdue,
  isToday,
  isTomorrow,
  onMarkDone,
}: {
  task: Task;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  onMarkDone: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50">
      <div className="w-12 text-xs font-semibold text-neutral-600">
        {task.dueAt ? timeHHMM(task.dueAt) : "—"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`truncate text-sm font-semibold ${
              isOverdue ? "text-red-600" : ""
            }`}
          >
            {task.title}
          </div>
          <PersonBadge personId={task.assigneeId} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOverdue && <StatusBadge label="Förfallet" variant="overdue" />}
          {isToday && !isOverdue && (
            <StatusBadge label="Idag" variant="today" />
          )}
          {isTomorrow && <StatusBadge label="Imorgon" variant="tomorrow" />}
          {!task.dueAt && (
            <StatusBadge label="Ingen deadline" variant="no-date" />
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {task.tags.map((tag) => (
                <TagBadge key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <button
          onClick={onMarkDone}
          className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99] transition-all"
        >
          Klar
        </button>
      </div>
    </div>
  );
}

function CompletedTaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-slate-600 line-through">
          {task.title}
        </div>
        {task.completedAt && (
          <div className="text-xs text-slate-400">
            Klar {timeHHMM(task.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-3 py-3 text-sm text-slate-500">{text}</div>;
}

function PersonBadge({ personId }: { personId: Exclude<PersonId, "family"> }) {
  const colors = PERSON_COLORS[personId];
  const person = people.find((p) => p.id === personId);

  return (
    <span
      className={`shrink-0 rounded-full ${colors.bg} ${colors.text} ${colors.border} border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide`}
    >
      {person?.name || personId}
    </span>
  );
}

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "overdue" | "today" | "tomorrow" | "no-date";
}) {
  const variants = {
    overdue: "bg-red-100 text-red-700 border-red-200",
    today: "bg-blue-100 text-blue-700 border-blue-200",
    tomorrow: "bg-amber-100 text-amber-700 border-amber-200",
    "no-date": "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${variants[variant]}`}
    >
      {label}
    </span>
  );
}

function TagBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}
