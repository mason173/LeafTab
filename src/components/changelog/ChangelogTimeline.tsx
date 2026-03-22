import { type ChangelogItem } from "@/components/changelog/changelog-data";

const formatChangelogDate = (rawDate: string, language?: string) => {
  const date = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return rawDate;
  try {
    return new Intl.DateTimeFormat(language || undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return rawDate;
  }
};

export function ChangelogTimeline({
  items,
  language,
}: {
  items: ChangelogItem[];
  language?: string;
}) {
  return (
    <div className="relative pb-1 pr-2">
      <div className="absolute left-11 top-2 bottom-2 w-px bg-border/60" aria-hidden="true" />
      {items.map((item, index) => {
        const notes = item.notes.filter(Boolean);
        return (
          <section key={item.version} className="relative grid grid-cols-[5.5rem_1fr] gap-3 pb-6 last:pb-0">
            <div className="relative z-10 flex items-start justify-center">
              <span
                className={`inline-flex min-w-[62px] justify-center rounded-full px-3 py-1 text-[15px] leading-none font-semibold tracking-wide ${
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-border/60"
                }`}
              >
                v{item.version}
              </span>
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="text-xs text-muted-foreground">{formatChangelogDate(item.date, language)}</div>
              {notes.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5 pl-4 list-disc marker:text-muted-foreground/80">
                  {notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="text-[13px] leading-5 font-normal text-foreground/90">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[13px] leading-5 font-normal text-muted-foreground">{`v${item.version}`}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

