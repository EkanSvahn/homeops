"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PersonId, Task, Event } from "@/lib/homeops.mock";
import { people, tasks as initialTasks, events } from "@/lib/homeops.mock";
import { loadTasksFromStorage, saveTasksToStorage } from "@/lib/storage";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTomorrow(date: Date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

function formatWeekdayDate(d: Date) {
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "2-digit", month: "short" });
}

function timeHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function selectPersonFromQuery(value: string | null): PersonId {
  const allowed: PersonId[] = ["family", "erik", "sofie", "ludwig", "alwa"];
  if (!value) return "family";
  return (allowed.includes(value as PersonId) ? (value as PersonId) : "family");
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
  const [completedPanelOpen, setCompletedPanelOpen] = useState(false);

  // Ladda tasks från localStorage vid mount
  useEffect(() => {
    const stored = loadTasksFromStorage();
    if (stored && stored.length > 0) {
      setTasks(stored);
    } else {
      // Spara initial tasks första gången
      saveTasksToStorage(initialTasks);
    }
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

    const bySelectedPerson = <T extends { personId?: string; assigneeId?: string }>(item: T) => {
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
      .filter((t) => bySelectedPerson(t) && (isOverdue(t) || isDueToday(t) || !t.dueAt))
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
  }, [selected, tasks]);

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

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-40 pt-4">
      {/* Header */}
      <div className="mb-3">
        <div className="text-sm text-slate-500">{formatWeekdayDate(new Date())}</div>
        <div className="text-2xl font-semibold tracking-tight">Idag</div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <TabButton active={model.selected === "family"} onClick={() => setPerson("family")}>Familj</TabButton>
        {people.map((p) => (
          <TabButton key={p.id} active={model.selected === p.id} onClick={() => setPerson(p.id)}>
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
            <EmptyLine text="Inga events idag." />
          ) : (
            model.eventsToday.map((e) => (
              <Row
                key={e.id}
                left={`${timeHHMM(e.startAt)}`}
                title={e.title}
                meta={e.location}
              />
            ))
          )}
        </CardList>

        {/* Events Tomorrow */}
        <SectionTitle title="Händer imorgon" />
        <CardList>
          {model.eventsTomorrow.length === 0 ? (
            <EmptyLine text="Inga events imorgon." />
          ) : (
            model.eventsTomorrow.map((e) => (
              <Row
                key={e.id}
                left={`${timeHHMM(e.startAt)}`}
                title={e.title}
                meta={e.location}
              />
            ))
          )}
        </CardList>

        {/* Tasks */}
        <SectionTitle title="Uppgifter" subtitle="Förfallet och idag." />
        <CardList>
          {model.tasksOpen.length === 0 ? (
            <EmptyLine text="Inget kritiskt idag." />
          ) : (
            model.tasksOpen.map((t) => {
              const isOverdue = t.dueAt && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  isOverdue={!!isOverdue}
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

      {/* Quick add placeholder */}
      <div className="fixed bottom-28 left-0 right-0 mx-auto w-full max-w-md px-4 z-[60]">
        <button className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99]">
          + Snabbt tillägg (kommer)
        </button>
      </div>
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={[
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
        "border shadow-sm",
        props.active ? "bg-black text-white border-black" : "bg-white text-black hover:bg-neutral-50",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-base font-semibold">{title}</div>
      {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function CardList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 rounded-2xl border bg-white p-2 shadow-sm">{children}</div>;
}

function Row(props: { left: string; title: string; meta?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-50">
      <div className="w-12 text-xs font-semibold text-neutral-600">{props.left}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{props.title}</div>
        {props.meta ? <div className="truncate text-xs text-slate-500">{props.meta}</div> : null}
      </div>
      {props.right ? <div className="shrink-0">{props.right}</div> : null}
    </div>
  );
}

function TaskRow({ task, isOverdue, onMarkDone }: { task: Task; isOverdue: boolean; onMarkDone: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-50">
      <div className="w-12 text-xs font-semibold text-neutral-600">
        {task.dueAt ? timeHHMM(task.dueAt) : "—"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className={`truncate text-sm font-semibold ${isOverdue ? "text-red-600" : ""}`}>
            {task.title}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {task.tags.map((tag) => (
                <TagBadge key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
        <div className="truncate text-xs text-slate-500">
          {task.status === "doing" ? "Pågående" : isOverdue ? "Förfallet" : "Att göra"}
        </div>
      </div>
      <div className="shrink-0">
        <button
          onClick={onMarkDone}
          className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99]"
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
        <div className="truncate text-sm text-slate-600 line-through">{task.title}</div>
        {task.completedAt && (
          <div className="text-xs text-slate-400">
            Klar {timeHHMM(task.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="px-3 py-3 text-sm text-slate-500">{text}</div>;
}

function Pill({ label }: { label: string }) {
  return <span className="rounded-full bg-neutral-100 px-2 py-1">{label}</span>;
}

function TagBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}
