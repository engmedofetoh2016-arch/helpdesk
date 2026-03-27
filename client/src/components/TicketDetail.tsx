import DOMPurify from "dompurify";
import { type Ticket } from "core/constants/ticket.ts";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <>
      <div>
        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-2xl font-semibold tracking-tight flex-1">
            {ticket.subject}
          </h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">From:</span>{" "}
            {ticket.senderName} ({ticket.senderEmail})
          </div>
          <div>
            <span className="font-medium text-foreground">Created:</span>{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium text-foreground">Updated:</span>{" "}
            {new Date(ticket.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {ticket.bodyHtml ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(ticket.bodyHtml),
              }}
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">
              {ticket.body}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
