import { PageSection } from "@/components/page-section";

const boardNotes = [
  "Sketch your swimlanes for chores, maintenance, and errands.",
  "Use cards to capture owners, deadlines, and quick notes.",
  "Promote finished work to keep the household aligned.",
];

export default function BoardsPage() {
  return (
    <PageSection
      title="Boards"
      description="Placeholder for the HomeOps kanban workspace."
    >
      <div className="space-y-3">
        {boardNotes.map((note) => (
          <div
            key={note}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
          >
            {note}
          </div>
        ))}
      </div>
    </PageSection>
  );
}
