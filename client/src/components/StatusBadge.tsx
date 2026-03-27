import { type TicketStatus, statusLabel } from "core/constants/ticket-status.ts";

const statusStyles: Record<TicketStatus, string> = {
  new: "bg-sky-500/15 text-sky-400",
  processing: "bg-amber-500/15 text-amber-400",
  open: "bg-pink-400/15 text-pink-400",
  resolved: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-0 px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}
