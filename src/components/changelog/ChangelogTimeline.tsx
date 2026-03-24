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
      {items.map((item) => {
        const notes = item.notes.filter(Boolean);
        return (
          <section key={item.version} className="relative grid grid-cols-[5.5rem_1fr] gap-3 pb-6 last:pb-0">
            <div className="relative z-10 flex items-start justify-center">
              <span
                className="inline-flex min-w-[62px] justify-center rounded-full border border-border/60 bg-muted px-3 py-1 text-[15px] leading-none font-semibold tracking-wide text-muted-foreground"
              >
                v{item.version}
              </span>
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatChangelogDate(item.date, language)}</span>
                {item.tag ? (
                  <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                    {item.tag}
                  </span>
                ) : null}
              </div>
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
