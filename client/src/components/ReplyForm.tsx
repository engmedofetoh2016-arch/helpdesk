import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import { createReplySchema, type CreateReplyInput } from "core/schemas/replies.ts";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";

interface ReplyFormProps {
  ticket: Ticket;
}

export default function ReplyForm({ ticket }: ReplyFormProps) {
  const ticketId = ticket.id;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
  });

  const bodyValue = watch("body");

  const replyMutation = useMutation({
    mutationFn: async (data: CreateReplyInput) => {
      const { data: reply } = await axios.post(
        `/api/tickets/${ticketId}/replies`,
        data
      );
      return reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
      reset();
    },
  });

  const polishMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/tickets/${ticketId}/replies/polish`, {
        body: getValues("body"),
      });
      return data.body as string;
    },
    onSuccess: (polishedText) => {
      setValue("body", polishedText, { shouldValidate: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => replyMutation.mutate(data))} className="space-y-3">
      {replyMutation.error && (
        <ErrorAlert error={replyMutation.error} fallback="Failed to send reply" />
      )}
      {polishMutation.error && (
        <ErrorAlert error={polishMutation.error} fallback="Failed to polish reply" />
      )}

      <div className="space-y-1">
        <Textarea
          placeholder="Type your reply..."
          {...register("body")}
          rows={4}
        />
        {errors.body && <ErrorMessage message={errors.body.message} />}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!bodyValue?.trim() || polishMutation.isPending || replyMutation.isPending}
          onClick={() => polishMutation.mutate()}
        >
          {polishMutation.isPending ? "Polishing..." : "Polish"}
        </Button>
        <Button type="submit" disabled={!bodyValue?.trim() || replyMutation.isPending || polishMutation.isPending}>
          {replyMutation.isPending ? "Sending..." : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
