import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import ErrorAlert from "@/components/ErrorAlert";
import BackLink from "@/components/BackLink";
import TicketDetailSkeleton from "@/components/TicketDetailSkeleton";
import TicketDetail from "@/components/TicketDetail";
import ReplyThread from "@/components/ReplyThread";
import ReplyForm from "@/components/ReplyForm";

export default function PortalTicketDetailPage() {
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
      <BackLink to="/portal">Back to my requests</BackLink>

      {isLoading && <TicketDetailSkeleton />}

      {error && (
        <ErrorAlert
          message={
            axios.isAxiosError(error) && error.response?.status === 404
              ? "Request not found"
              : axios.isAxiosError(error) && error.response?.status === 403
                ? "You cannot access this request"
                : "Failed to load request"
          }
        />
      )}

      {ticket && (
        <div className="space-y-6 max-w-3xl">
          <TicketDetail ticket={ticket} />

          <div className="space-y-3">
            <h2 className="text-lg font-medium">Messages</h2>
            <ReplyThread ticket={ticket} />
          </div>

          <div className="space-y-3 pb-16">
            <h2 className="text-lg font-medium">Add a message</h2>
            <ReplyForm ticket={ticket} polishMode="draft" />
          </div>
        </div>
      )}
    </div>
  );
}
