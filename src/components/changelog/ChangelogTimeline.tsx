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
    <div className="relative pb-1 pr-1">
      <div className="absolute left-[2.7rem] top-2 bottom-2 w-px bg-border/60" aria-hidden="true" />
      {items.map((item) => {
        const notes = item.notes.filter(Boolean);
        return (
          <section key={item.version} className="relative grid grid-cols-[4rem_1fr] gap-2.5 pb-[18px] last:pb-0">
            <div className="relative z-10 flex items-start justify-center">
              <span
                className="inline-flex min-w-[50px] justify-center rounded-full border border-border/60 bg-muted px-2 py-1 text-[11px] leading-none font-semibold tracking-wide text-muted-foreground"
              >
                v{item.version}
              </span>
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{formatChangelogDate(item.date, language)}</span>
                {item.tag ? (
                  <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                    {item.tag}
                  </span>
                ) : null}
              </div>
              {notes.length > 0 ? (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-3.5 marker:text-muted-foreground/80">
                  {notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="text-[11px] leading-[1.65] font-normal text-foreground/88">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11px] leading-[1.65] font-normal text-muted-foreground">{`v${item.version}`}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
