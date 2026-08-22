import type { ProjectEvent } from "@/lib/domain/types";
import { formatDate } from "@/lib/presentation/labels";

export function ProjectTimeline({ events }: { events: ProjectEvent[] }) {
  if (events.length === 0) return <p className="empty-copy">Nenhum evento público registrado.</p>;

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <div className="timeline-marker" aria-hidden="true" />
          <div className="timeline-content">
            <div className="timeline-heading">
              <strong>{event.title}</strong>
              <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
            </div>
            <p>{event.description}</p>
            <span className="timeline-version">estado material v{event.materialVersion}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
