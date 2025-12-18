import { PageSection } from "@/components/page-section";

const listIdeas = [
  { title: "Pantry", detail: "Essentials to keep restocked for the week." },
  { title: "Home care", detail: "Cleaning supplies, filters, light bulbs, and tools." },
  { title: "Bulk buys", detail: "Track big-box runs and online orders in one list." },
];

export default function ShoppingPage() {
  return (
    <PageSection
      title="Shopping"
      description="Placeholder for household shopping lists and supply tracking."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {listIdeas.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.title}
            </p>
            <p className="mt-2 text-sm text-slate-700">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Add list names, owners, and due dates to keep supplies moving.
      </div>
    </PageSection>
  );
}
