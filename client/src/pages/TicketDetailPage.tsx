import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import ErrorAlert from "@/components/ErrorAlert";
import BackLink from "@/components/BackLink";
import TicketDetailSkeleton from "@/components/TicketDetailSkeleton";
import TicketDetail from "@/components/TicketDetail";
import UpdateTicket from "@/components/UpdateTicket";
import ReplyThread from "@/components/ReplyThread";
import ReplyForm from "@/components/ReplyForm";
import TicketSummary from "@/components/TicketSummary";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await axios.get<Ticket>(`/api/tickets/${id}`);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <BackLink to="/tickets">Back to tickets</BackLink>

      {isLoading && <TicketDetailSkeleton />}

      {error && (
        <ErrorAlert
          message={
            axios.isAxiosError(error) && error.response?.status === 404
              ? "Ticket not found"
              : "Failed to load ticket"
          }
        />
      )}

      {ticket && (
        <div className="grid grid-cols-[1fr_auto] gap-6">
          <div className="space-y-6">
            <TicketDetail ticket={ticket} />

            <TicketSummary ticket={ticket} />

            <div className="space-y-3">
              <h2>Replies</h2>
              <ReplyThread ticket={ticket} />
            </div>

            <div className="space-y-3 pb-16">
              <h2>Add a Reply</h2>
              <ReplyForm ticket={ticket} />
            </div>
          </div>

          <UpdateTicket ticket={ticket} />
        </div>
      )}
    </div>
  );
}
