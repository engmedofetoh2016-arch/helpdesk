import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  customerCreateTicketSchema,
  type CustomerCreateTicketInput,
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
import { useSession } from "@/lib/auth-client";

export default function PortalNewTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerCreateTicketInput>({
    resolver: zodResolver(customerCreateTicketSchema),
  });

  const bodyValue = watch("body");

  const mutation = useMutation({
    mutationFn: async (data: CustomerCreateTicketInput) => {
      const { data: ticket } = await axios.post<{ id: number }>(
        "/api/tickets",
        data
      );
      return ticket;
    },
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/portal/tickets/${ticket.id}`, { replace: true });
    },
  });

  const polishMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<{ body: string }>(
        "/api/tickets/polish-draft",
        { body: getValues("body") }
      );
      return data.body;
    },
    onSuccess: (text) => {
      setValue("body", text, { shouldValidate: true });
    },
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/portal"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my requests
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your issue. Use <strong>Polish with AI</strong> if you want
          help rephrasing (requires OpenAI on the server).
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            Signed in as {session?.user?.name} ({session?.user?.email}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isError && (
            <ErrorAlert
              error={mutation.error}
              fallback="Could not submit request"
              className="mb-4"
            />
          )}
          {polishMutation.isError && (
            <ErrorAlert
              error={polishMutation.error}
              fallback="AI polish failed"
              className="mb-4"
            />
          )}
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register("subject")} />
              <ErrorMessage message={errors.subject?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" rows={8} {...register("body")} />
              <ErrorMessage message={errors.body?.message} />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  !bodyValue?.trim() ||
                  polishMutation.isPending ||
                  mutation.isPending
                }
                onClick={() => polishMutation.mutate()}
              >
                {polishMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Polishing...
                  </>
                ) : (
                  "Polish with AI"
                )}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || polishMutation.isPending}
              >
                {mutation.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
