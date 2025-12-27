// src/lib/homeops.mock.ts
export type PersonId = "family" | "erik" | "sofie" | "ludwig" | "alwa";

export type Person = {
  id: Exclude<PersonId, "family">;
  name: string;
};

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  title: string;
  assigneeId: Exclude<PersonId, "family">;
  dueAt?: string; // ISO
  status: TaskStatus;
  completedAt?: string; // ISO - när task blev klar
  tags?: Array<"Ta med" | "Skola" | "Viktigt" | string>; // Generiska tags
  pinned?: boolean; // Om task är pinad (viktig)
};

export type Event = {
  id: string;
  title: string;
  personId: Exclude<PersonId, "family">;
  startAt: string; // ISO
  endAt?: string; // ISO
  location?: string;
  completed?: boolean; // Om händelsen är genomförd
  completedAt?: string; // ISO - när händelsen markerades som färdig
};

export const people: Person[] = [
  { id: "erik", name: "Erik" },
  { id: "sofie", name: "Sofie" },
  { id: "ludwig", name: "Ludwig" },
  { id: "alwa", name: "Alwa" },
];

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const tomorrowAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const events: Event[] = [
  {
    id: "e1",
    title: "Tandläkare",
    personId: "ludwig",
    startAt: todayAt("10:30"),
    location: "Folktandvården",
  },
  {
    id: "e2",
    title: "Utflykt",
    personId: "alwa",
    startAt: todayAt("09:00"),
    location: "Skolan",
  },
  // Tomorrow events
  {
    id: "e3",
    title: "Fotbollsträning",
    personId: "ludwig",
    startAt: tomorrowAt("16:00"),
    location: "Idrottshall",
  },
  {
    id: "e4",
    title: "Föräldramöte",
    personId: "erik",
    startAt: tomorrowAt("18:00"),
    location: "Skolan",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Ring vårdcentralen",
    assigneeId: "sofie",
    dueAt: todayAt("12:00"),
    status: "todo",
  },
  {
    id: "t2",
    title: "Skicka svar till skolan",
    assigneeId: "erik",
    dueAt: todayAt("16:00"),
    status: "doing",
  },

  // Tasks med tags (generiska)
  {
    id: "t3",
    title: "Fika till skolan",
    assigneeId: "ludwig",
    dueAt: todayAt("08:00"),
    status: "todo",
    tags: ["Ta med", "Skola"],
  },
  {
    id: "t4",
    title: "Matsäck",
    assigneeId: "alwa",
    dueAt: todayAt("08:00"),
    status: "todo",
    tags: ["Ta med"],
  },
  {
    id: "t5",
    title: "Regnkläder",
    assigneeId: "alwa",
    dueAt: todayAt("08:00"),
    status: "todo",
    tags: ["Ta med"],
  },

  // Tomorrow example
  {
    id: "t6",
    title: "Handla mjölk",
    assigneeId: "erik",
    dueAt: tomorrowAt("18:00"),
    status: "todo",
  },

  // Overdue example (yesterday)
  {
    id: "t7",
    title: "Betala räkning",
    assigneeId: "erik",
    dueAt: new Date(Date.now() - 86400000).toISOString(),
    status: "todo",
  },
];
