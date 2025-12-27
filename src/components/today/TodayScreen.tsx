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
import { useConfirm } from "../ui/ConfirmDialog";

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
  eventsUpcoming: Event[];
  tasksOpen: Task[];
  tasksUpcoming: Task[];
  tasksDoneToday: Task[];
};

export default function TodayScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = selectPersonFromQuery(sp.get("person"));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [completedPanelOpen, setCompletedPanelOpen] = useState(false);
  const [upcomingTasksOpen, setUpcomingTasksOpen] = useState(false);
  const [upcomingEventsOpen, setUpcomingEventsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Task | Event | null>(null);
  const confirm = useConfirm();

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

    const isUpcoming = (t: Task) => {
      if (!t.dueAt) return false;
      const due = new Date(t.dueAt);
      const startOfTomorrow = new Date(now);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      startOfTomorrow.setHours(0, 0, 0, 0);
      return due >= startOfTomorrow;
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

    // Events: kommande (efter imorgon)
    const isEventUpcoming = (e: Event) => {
      if (!e.startAt) return false;
      const start = new Date(e.startAt);
      const startOfDayAfterTomorrow = new Date(now);
      startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 2);
      startOfDayAfterTomorrow.setHours(0, 0, 0, 0);
      return start >= startOfDayAfterTomorrow;
    };

    const eventsUpcoming = events
      .filter((e) => bySelectedPerson(e) && isEventUpcoming(e))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));

    // Tasks: öppna (overdue + today + no date)
    const openTasks = tasks.filter((t) => t.status !== "done");

    const tasksOpen = openTasks
      .filter(
        (t) =>
          bySelectedPerson(t) && (isOverdue(t) || isDueToday(t) || !t.dueAt)
      )
      .sort((a, b) => {
        // Sortering: pinned först, sedan overdue, sedan idag med tid, sedan idag utan tid
        const aPinned = a.pinned || false;
        const bPinned = b.pinned || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

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

    // Tasks: kommande (imorgon och framåt)
    const tasksUpcoming = openTasks
      .filter((t) => bySelectedPerson(t) && isUpcoming(t))
      .sort((a, b) => {
        // Sortering: pinned först, sedan på datum
        const aPinned = a.pinned || false;
        const bPinned = b.pinned || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        // Sortera på datum
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

    return {
      selected,
      eventsToday,
      eventsTomorrow,
      eventsUpcoming,
      tasksOpen,
      tasksUpcoming,
      tasksDoneToday,
    };
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

  const handleSnooze = (taskId: string, target: "later-today" | "tomorrow") => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const now = new Date();
        let newDueAt: string;

        if (target === "later-today") {
          // Sätt till 2 timmar från nu, eller 18:00 om det är senare
          const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const endOfDay = new Date(now);
          endOfDay.setHours(18, 0, 0, 0);
          newDueAt = (later < endOfDay ? later : endOfDay).toISOString();
        } else {
          // Imorgon kl 12:00
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(12, 0, 0, 0);
          newDueAt = tomorrow.toISOString();
        }

        return {
          ...t,
          dueAt: newDueAt,
        };
      }
      return t;
    });
    setTasks(updated);
    saveTasksToStorage(updated);
  };

  const handleDelegate = (
    taskId: string,
    newAssigneeId: Exclude<PersonId, "family">
  ) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          assigneeId: newAssigneeId,
        };
      }
      return t;
    });
    setTasks(updated);
    saveTasksToStorage(updated);
  };

  const handleTogglePin = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          pinned: !t.pinned,
        };
      }
      return t;
    });
    setTasks(updated);
    saveTasksToStorage(updated);
  };

  const handleEdit = (item: Task | Event) => {
    setItemToEdit(item);
    setIsQuickAddOpen(true);
  };

  const handleDelete = async (item: Task | Event) => {
    const ok = await confirm({
      title: "Ta bort?",
      body: "Objektet tas bort permanent.",
      confirmText: "Ta bort",
      cancelText: "Behåll",
      variant: "danger",
    });
    if (!ok) return;

    if ("startAt" in item) {
      // Event
      const updated = events.filter((e) => e.id !== item.id);
      setEvents(updated);
      saveEventsToStorage(updated);
    } else {
      // Task
      const updated = tasks.filter((t) => t.id !== item.id);
      setTasks(updated);
      saveTasksToStorage(updated);
    }
  };

  const handleSave = (item: Task | Event) => {
    if (itemToEdit && itemToEdit.id === item.id) {
      // Redigerar befintligt item
      const wasEvent = "startAt" in itemToEdit;
      const isEvent = "startAt" in item;

      if (wasEvent && isEvent) {
        // Event -> Event (uppdatera)
        const updated = events.map((e) => (e.id === item.id ? item : e));
        setEvents(updated);
        saveEventsToStorage(updated);
      } else if (!wasEvent && !isEvent) {
        // Task -> Task (uppdatera)
        const updated = tasks.map((t) => (t.id === item.id ? item : t));
        setTasks(updated);
        saveTasksToStorage(updated);
      } else if (wasEvent && !isEvent) {
        // Event -> Task (konvertera)
        // Ta bort från events, lägg till i tasks
        const updatedEvents = events.filter((e) => e.id !== item.id);
        setEvents(updatedEvents);
        saveEventsToStorage(updatedEvents);

        const updatedTasks = [...tasks, item];
        setTasks(updatedTasks);
        saveTasksToStorage(updatedTasks);
      } else if (!wasEvent && isEvent) {
        // Task -> Event (konvertera)
        // Ta bort från tasks, lägg till i events
        const updatedTasks = tasks.filter((t) => t.id !== item.id);
        setTasks(updatedTasks);
        saveTasksToStorage(updatedTasks);

        const updatedEvents = [...events, item];
        setEvents(updatedEvents);
        saveEventsToStorage(updatedEvents);
      }
    } else {
      // Nytt item
      if ("startAt" in item) {
        // New event
        setEvents([...events, item]);
        saveEventsToStorage([...events, item]);
      } else {
        // New task
        setTasks([...tasks, item]);
        saveTasksToStorage([...tasks, item]);
      }
    }
    setItemToEdit(null);
    setIsQuickAddOpen(false);
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
                onEdit={() => handleEdit(e)}
                onDelete={() => handleDelete(e)}
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
                onEdit={() => handleEdit(e)}
                onDelete={() => handleDelete(e)}
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
                  onSnooze={(target) => handleSnooze(t.id, target)}
                  onDelegate={(personId) => handleDelegate(t.id, personId)}
                  onTogglePin={() => handleTogglePin(t.id)}
                  onEdit={() => handleEdit(t)}
                  onDelete={() => handleDelete(t)}
                />
              );
            })
          )}
        </CardList>

        {/* Kommande Händelser */}
        {model.eventsUpcoming.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm">
            <button
              onClick={() => setUpcomingEventsOpen(!upcomingEventsOpen)}
              className="w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">
                    Kommande Händelser ({model.eventsUpcoming.length})
                  </div>
                  <div className="text-sm text-slate-500">Efter imorgon</div>
                </div>
                <div className="text-sm text-slate-500">
                  {upcomingEventsOpen ? "▼" : "▶"}
                </div>
              </div>
            </button>
            {upcomingEventsOpen && (
              <div className="border-t p-2">
                <CardList>
                  {model.eventsUpcoming.map((e) => (
                    <EventRow
                      key={e.id}
                      event={e}
                      onToggleDone={() => handleToggleEventDone(e.id)}
                      onEdit={() => handleEdit(e)}
                      onDelete={() => handleDelete(e)}
                      isUpcoming={true}
                    />
                  ))}
                </CardList>
              </div>
            )}
          </div>
        )}

        {/* Kommande Uppgifter */}
        {model.tasksUpcoming.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm">
            <button
              onClick={() => setUpcomingTasksOpen(!upcomingTasksOpen)}
              className="w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">
                    Kommande Uppgifter ({model.tasksUpcoming.length})
                  </div>
                  <div className="text-sm text-slate-500">
                    Imorgon och framåt
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {upcomingTasksOpen ? "▼" : "▶"}
                </div>
              </div>
            </button>
            {upcomingTasksOpen && (
              <div className="border-t p-2">
                <CardList>
                  {model.tasksUpcoming.map((t) => {
                    const isTomorrowTask =
                      t.dueAt && isTomorrow(new Date(t.dueAt));
                    return (
                      <TaskRow
                        key={t.id}
                        task={t}
                        isOverdue={false}
                        isToday={false}
                        isTomorrow={!!isTomorrowTask}
                        onMarkDone={() => handleMarkDone(t.id)}
                        onSnooze={(target) => handleSnooze(t.id, target)}
                        onDelegate={(personId) =>
                          handleDelegate(t.id, personId)
                        }
                        onTogglePin={() => handleTogglePin(t.id)}
                        onEdit={() => handleEdit(t)}
                        onDelete={() => handleDelete(t)}
                      />
                    );
                  })}
                </CardList>
              </div>
            )}
          </div>
        )}

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
        onClose={() => {
          setIsQuickAddOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSave}
        itemToEdit={itemToEdit}
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
  onEdit,
  onDelete,
  isUpcoming,
}: {
  event: Event;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isUpcoming?: boolean;
}) {
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [eventMenuUpward, setEventMenuUpward] = useState(false);
  const isCompleted = event.completed;
  const timeIndicator = getTimeIndicator(event.startAt);

  // Formatera datum för kommande händelser
  const formatEventDate = () => {
    if (!event.startAt) return "";
    const eventDate = new Date(event.startAt);

    // Om det är imorgon, visa "Imorgon" + tid
    if (isTomorrow(eventDate)) {
      return `Imorgon ${timeHHMM(event.startAt)}`;
    }

    // Annars visa datum + tid (för kommande events)
    const dateStr = eventDate.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
    });
    const timeStr = timeHHMM(event.startAt);
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div
        className={`${
          isUpcoming ? "w-24" : "w-12"
        } text-xs font-semibold text-neutral-600 shrink-0`}
      >
        {isUpcoming ? formatEventDate() : timeHHMM(event.startAt)}
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
          {!isUpcoming && (
            <span
              className={`text-xs ${
                isCompleted ? "text-slate-300" : "text-slate-400"
              }`}
            >
              {timeIndicator}
            </span>
          )}
        </div>
        {isCompleted && event.completedAt && (
          <div className="text-xs text-slate-400 mt-1">
            Genomförd {timeHHMM(event.completedAt)}
          </div>
        )}
      </div>
      <div className="shrink-0 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const buttonRect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const quickAddButtonHeight = 112;
            const estimatedMenuHeight = 200;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const shouldOpenUpward =
              spaceBelow < estimatedMenuHeight ||
              buttonRect.bottom + estimatedMenuHeight >
                viewportHeight - quickAddButtonHeight;
            setEventMenuOpen(true);
            setEventMenuUpward(shouldOpenUpward);
          }}
          className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99] transition-all"
        >
          ⋯
        </button>
        {eventMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[70]"
              onClick={() => {
                setEventMenuOpen(false);
              }}
            />
            <div
              className={`absolute right-0 z-[80] bg-white border rounded-xl shadow-lg min-w-[160px] overflow-hidden ${
                eventMenuUpward ? "bottom-full mb-1" : "top-full mt-1"
              }`}
            >
              {!isCompleted ? (
                <button
                  onClick={() => {
                    onToggleDone();
                    setEventMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  <span>✓</span> Färdig
                </button>
              ) : (
                <button
                  onClick={() => {
                    onToggleDone();
                    setEventMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  <span>↩</span> Ångra
                </button>
              )}
              <div className="border-t my-1"></div>
              <button
                onClick={() => {
                  onEdit();
                  setEventMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
              >
                <span>✏️</span> Redigera
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setEventMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <span>🗑️</span> Ta bort
              </button>
            </div>
          </>
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
  onSnooze,
  onDelegate,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  task: Task;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  onMarkDone: () => void;
  onSnooze: (target: "later-today" | "tomorrow") => void;
  onDelegate: (personId: Exclude<PersonId, "family">) => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showDelegateMenu, setShowDelegateMenu] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  // Formatera datum/tid för visning
  const formatDueDate = () => {
    if (!task.dueAt) return "—";
    const dueDate = new Date(task.dueAt);

    // Om det är idag, visa bara tid
    if (isToday) {
      return timeHHMM(task.dueAt);
    }

    // Om det är imorgon, visa "Imorgon" + tid
    if (isTomorrow) {
      return `Imorgon ${timeHHMM(task.dueAt)}`;
    }

    // Annars visa datum + tid (för kommande tasks)
    const dateStr = dueDate.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
    });
    const timeStr = timeHHMM(task.dueAt);
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50 relative">
      <div className="w-20 text-xs font-semibold text-neutral-600 shrink-0">
        {formatDueDate()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {task.pinned && (
            <span className="text-amber-500 text-sm" title="Pinnad">
              📌
            </span>
          )}
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
      <div className="shrink-0 relative">
        <button
          onClick={(e) => {
            const buttonRect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const quickAddButtonHeight = 112; // bottom-28 (112px) + button height
            const estimatedMenuHeight = 300; // Estimated max height of menu

            // Check if menu would go below Quick Add button
            const spaceBelow = viewportHeight - buttonRect.bottom;

            // Open upward if there's not enough space below, or if it would overlap with Quick Add
            const shouldOpenUpward =
              spaceBelow < estimatedMenuHeight ||
              buttonRect.bottom + estimatedMenuHeight >
                viewportHeight - quickAddButtonHeight;

            setOpenUpward(shouldOpenUpward);
            setShowActions(!showActions);
          }}
          className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99] transition-all"
        >
          ⋯
        </button>

        {showActions && (
          <>
            <div
              className="fixed inset-0 z-[70]"
              onClick={() => {
                setShowActions(false);
                setShowSnoozeMenu(false);
                setShowDelegateMenu(false);
              }}
            />
            <div
              className={`absolute right-0 z-[80] bg-white border rounded-xl shadow-lg min-w-[160px] overflow-hidden ${
                openUpward ? "bottom-full mb-1" : "top-full mt-1"
              }`}
            >
              <button
                onClick={() => {
                  onMarkDone();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
              >
                <span>✓</span> Klar
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSnoozeMenu(!showSnoozeMenu);
                    setShowDelegateMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  <span>⏰</span> Snooze
                  <span className="ml-auto">▶</span>
                </button>
                {showSnoozeMenu && (
                  <div className="bg-slate-50 border-t">
                    <button
                      onClick={() => {
                        onSnooze("later-today");
                        setShowActions(false);
                        setShowSnoozeMenu(false);
                      }}
                      className="w-full px-4 py-2 pl-8 text-left text-xs hover:bg-neutral-100"
                    >
                      Senare idag
                    </button>
                    <button
                      onClick={() => {
                        onSnooze("tomorrow");
                        setShowActions(false);
                        setShowSnoozeMenu(false);
                      }}
                      className="w-full px-4 py-2 pl-8 text-left text-xs hover:bg-neutral-100"
                    >
                      Imorgon
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDelegateMenu(!showDelegateMenu);
                    setShowSnoozeMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  <span>👤</span> Delegera
                  <span className="ml-auto">▶</span>
                </button>
                {showDelegateMenu && (
                  <div className="bg-slate-50 border-t">
                    {people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onDelegate(p.id);
                          setShowActions(false);
                          setShowDelegateMenu(false);
                        }}
                        className={`w-full px-4 py-2 pl-8 text-left text-xs hover:bg-neutral-100 ${
                          task.assigneeId === p.id
                            ? "bg-blue-50 font-semibold"
                            : ""
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  onTogglePin();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
              >
                <span>📌</span> {task.pinned ? "Ta bort pin" : "Pin"}
              </button>
              <div className="border-t my-1"></div>
              <button
                onClick={() => {
                  onEdit();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
              >
                <span>✏️</span> Redigera
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <span>🗑️</span> Ta bort
              </button>
            </div>
          </>
        )}
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
