import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import { type SenderType, senderTypeLabel } from "core/constants/sender-type.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import { Bot, User } from "lucide-react";

interface Reply {
  id: number;
  body: string;
  bodyHtml: string | null;
  senderType: SenderType;
  user: { id: string; name: string } | null;
  createdAt: string;
}

interface ReplyThreadProps {
  ticket: Ticket;
}

export default function ReplyThread({ ticket }: ReplyThreadProps) {
  const { id: ticketId, senderName } = ticket;
  const { data, isLoading, error } = useQuery({
    queryKey: ["replies", ticketId],
    queryFn: async () => {
      const { data } = await axios.get<{ replies: Reply[] }>(
        `/api/tickets/${ticketId}/replies`
      );
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message="Failed to load replies" />;
  }

  if (!data?.replies.length) {
    return <p className="text-sm text-muted-foreground">No replies yet</p>;
  }

  return (
    <div className="space-y-3">
      {data.replies.map((reply) => {
        const isAgent = reply.senderType === "agent";
        const displayName = isAgent
          ? reply.user?.name ?? "Agent"
          : senderName;

        return (
          <Card
            key={reply.id}
            className={isAgent ? "border-primary/25" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-md flex items-center justify-center ${
                    isAgent
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isAgent ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {displayName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {senderTypeLabel[reply.senderType]} &middot;{" "}
                    {new Date(reply.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reply.bodyHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(reply.bodyHtml),
                  }}
                />
              ) : (
                <p className="whitespace-pre-line leading-relaxed">
                  {reply.body}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
