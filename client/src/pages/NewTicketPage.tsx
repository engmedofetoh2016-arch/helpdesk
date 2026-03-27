import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  createTicketSchema,
  type CreateTicketInput,
} from "core/schemas/tickets.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import { ArrowLeft, Loader2 } from "lucide-react";

const formSchema = createTicketSchema;

type FormData = CreateTicketInput;

export default function NewTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: ticket } = await axios.post<{ id: number }>(
        "/api/tickets",
        data
      );
      return ticket;
    },
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["ticket-customers"] });
      navigate(`/tickets/${ticket.id}`, { replace: true });
    },
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a ticket on behalf of a customer (email or phone follow-ups).
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Customer &amp; message</CardTitle>
          <CardDescription>
            The customer appears as the sender on this ticket. AI classification
            runs the same as for inbound email when configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isError && (
            <ErrorAlert
              error={mutation.error}
              fallback="Could not create ticket"
              className="mb-4"
            />
          )}
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="senderName">Customer name</Label>
              <Input id="senderName" {...register("senderName")} />
              <ErrorMessage message={errors.senderName?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Customer email</Label>
              <Input
                id="senderEmail"
                type="email"
                autoComplete="email"
                {...register("senderEmail")}
              />
              <ErrorMessage message={errors.senderEmail?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register("subject")} />
              <ErrorMessage message={errors.subject?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={8}
                className="resize-y min-h-[120px]"
                {...register("body")}
              />
              <ErrorMessage message={errors.body?.message} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create ticket
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/tickets">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
