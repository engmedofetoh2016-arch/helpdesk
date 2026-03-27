import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-96" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
