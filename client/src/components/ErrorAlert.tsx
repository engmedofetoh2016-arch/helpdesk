import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  /** Direct message string to display. */
  message?: string;
  /** Error object — if an Axios error, the server message is extracted automatically. */
  error?: Error | null;
  /** Fallback message when `error` doesn't contain a server message. */
  fallback?: string;
  className?: string;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return fallback;
}

export default function ErrorAlert({
  message,
  error,
  fallback = "Something went wrong",
  className,
}: ErrorAlertProps) {
  const text = message ?? getErrorMessage(error, fallback);

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}
