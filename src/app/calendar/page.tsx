import { PageSection } from "@/components/page-section";

const calendarIdeas = [
  "Plot recurring routines like laundry, cleaning, and trash pickup.",
  "Reserve windows for repairs, deliveries, or visitor schedules.",
  "Connect events to boards so work and time stay in sync.",
];

export default function CalendarPage() {
  return (
    <PageSection
      title="Calendar"
      description="Schedule placeholder for household timelines."
    >
      <ul className="space-y-2 text-sm text-slate-700">
        {calendarIdeas.map((idea) => (
          <li
            key={idea}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            {idea}
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
