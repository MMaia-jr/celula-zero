import type { ProjectEvent } from "@/lib/domain/types";
import { formatLocalizedDate, type Locale } from "@/lib/i18n/core";

export function ProjectTimeline({
  events,
  locale = "pt",
}: {
  events: ProjectEvent[];
  locale?: Locale;
}) {
  const en = locale === "en";

  if (events.length === 0) {
    return (
      <p className="empty-copy">
        {en ? "No public events recorded." : "Nenhum evento público registrado."}
      </p>
    );
  }

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <div className="timeline-marker" aria-hidden="true" />
          <div className="timeline-content">
            <div className="timeline-heading">
              <strong>{event.title}</strong>
              <time dateTime={event.occurredAt}>
                {formatLocalizedDate(event.occurredAt, locale)}
              </time>
            </div>
            <p>{event.description}</p>
            <span className="timeline-version">
              {en ? "material state" : "estado material"} v{event.materialVersion}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
