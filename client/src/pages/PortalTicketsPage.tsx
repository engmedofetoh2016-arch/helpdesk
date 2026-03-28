import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TicketsTable from "./TicketsTable";
import TicketsFilters from "./TicketsFilters";
import type { TicketFilters } from "./TicketsPage";

export default function PortalTicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
        <Button asChild>
          <Link to="/portal/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New request
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
        You are signed in as a customer. You only see tickets tied to your
        account email.
      </p>

      <TicketsFilters
        filters={filters}
        onChange={setFilters}
        customers={[]}
        customersLoading={false}
        hideCustomerPicker
        searchPlaceholder="Search subject or message..."
      />
      <TicketsTable filters={filters} detailBasePath="/portal/tickets" />
    </div>
  );
}
