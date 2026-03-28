import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory } from "core/constants/ticket-category.ts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TicketsTable from "./TicketsTable";
import TicketsFilters from "./TicketsFilters";

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
  senderEmail?: string;
}

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["ticket-customers"],
    queryFn: async () => {
      const { data } = await axios.get<{
        customers: { senderEmail: string; senderName: string }[];
      }>("/api/tickets/customers");
      return data.customers;
    },
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New ticket
          </Link>
        </Button>
      </div>

      <details className="mb-6 rounded-lg border border-dashed bg-card text-card-foreground">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Email &amp; webhook setup{" "}
          <span className="text-muted-foreground font-normal">
            — click to expand
          </span>
        </summary>
        <div className="border-t px-4 pb-4 pt-2 text-sm text-muted-foreground space-y-3">
          <p>
            Configure{" "}
            <strong className="text-foreground font-medium">SendGrid Inbound Parse</strong>{" "}
            (or similar) to POST to{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              /api/webhooks/inbound-email
            </code>{" "}
            with header{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              x-webhook-secret
            </code>{" "}
            (same value as{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">WEBHOOK_SECRET</code>{" "}
            in Coolify or <code className="text-xs bg-muted px-1 py-0.5 rounded">server/.env</code>
            ), or use <code className="text-xs bg-muted px-1 py-0.5 rounded">?secret=...</code>{" "}
            on the URL. Replies in the same thread are added to the existing ticket.
          </p>
          <p>
            For <strong className="text-foreground font-medium">outbound</strong> replies to
            customers, set <code className="text-xs bg-muted px-1 py-0.5 rounded">SENDGRID_API_KEY</code>{" "}
            and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">SENDGRID_FROM_EMAIL</code>{" "}
            (verified in SendGrid).
          </p>
          <p className="text-xs">
            Full variable tables and DNS steps are in the repository{" "}
            <strong className="text-foreground">README</strong> (section{" "}
            <em>Email: inbound tickets and outbound replies</em>).
          </p>
          <p>
            You can also log phone or walk-up requests using{" "}
            <strong className="text-foreground font-medium">New ticket</strong> above.
          </p>
        </div>
      </details>

      <TicketsFilters
        filters={filters}
        onChange={setFilters}
        customers={customers}
        customersLoading={customersLoading}
      />
      <TicketsTable filters={filters} />
    </div>
  );
}
