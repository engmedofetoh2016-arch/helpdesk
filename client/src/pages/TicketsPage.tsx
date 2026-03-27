import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory } from "core/constants/ticket-category.ts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

      <Card className="mb-6 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How tickets arrive</CardTitle>
          <CardDescription>
            Email: configure SendGrid Inbound Parse (or similar) to POST to your
            server at{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              /api/webhooks/inbound-email
            </code>{" "}
            with header{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              x-webhook-secret
            </code>{" "}
            (same value as{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              WEBHOOK_SECRET
            </code>{" "}
            in <code className="text-xs bg-muted px-1 py-0.5 rounded">server/.env</code>
            ). Replies in the same thread are added to the existing ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground pt-0">
          You can also log phone or walk-up requests using{" "}
          <strong className="text-foreground font-medium">New ticket</strong>{" "}
          above.
        </CardContent>
      </Card>

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
