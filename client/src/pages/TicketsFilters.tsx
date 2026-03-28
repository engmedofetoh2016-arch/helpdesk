import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { ticketStatuses, statusLabel } from "core/constants/ticket-status.ts";
import type { TicketFilters } from "./TicketsPage";

const ALL = "__all__";

interface TicketsFiltersProps {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  customers: { senderEmail: string; senderName: string }[];
  customersLoading: boolean;
  /** Hide customer email filter (customer portal). */
  hideCustomerPicker?: boolean;
  searchPlaceholder?: string;
}

export default function TicketsFilters({
  filters,
  onChange,
  customers,
  customersLoading,
  hideCustomerPicker = false,
  searchPlaceholder = "Search subject, name, or email...",
}: TicketsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="pl-8"
        />
      </div>

      {!hideCustomerPicker && (
        <Select
          value={filters.senderEmail ?? ALL}
          onValueChange={(value) =>
            onChange({
              ...filters,
              senderEmail: value === ALL ? undefined : value,
            })
          }
          disabled={customersLoading}
        >
          <SelectTrigger className="w-[min(100%,280px)] sm:w-[260px]">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.senderEmail} value={c.senderEmail}>
                <span className="truncate block max-w-[240px]">
                  {c.senderName} ({c.senderEmail})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, status: value === ALL ? undefined : (value as TicketFilters["status"]) })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ticketStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabel[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, category: value === ALL ? undefined : (value as TicketFilters["category"]) })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          <SelectItem value="general_question">General question</SelectItem>
          <SelectItem value="technical_question">Technical question</SelectItem>
          <SelectItem value="refund_request">Refund request</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
