import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import {
  TicketIcon,
  CircleDot,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";

interface Stats {
  totalTickets: number;
  openTickets: number;
  resolvedByAI: number;
  aiResolutionRate: number;
  avgResolutionTime: number;
}

interface DailyVolume {
  data: { date: string; tickets: number }[];
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "N/A";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const chartConfig = {
  tickets: {
    label: "Tickets",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function HomePage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<Stats>({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const res = await axios.get("/api/tickets/stats");
      return res.data;
    },
  });

  const {
    data: volume,
    isLoading: volumeLoading,
    error: volumeError,
  } = useQuery<DailyVolume>({
    queryKey: ["ticket-daily-volume"],
    queryFn: async () => {
      const res = await axios.get("/api/tickets/stats/daily-volume");
      return res.data;
    },
  });

  if (statsError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Dashboard
        </h1>
        <ErrorAlert
          error={statsError}
          fallback="Failed to load dashboard stats"
        />
      </div>
    );
  }

  const cards = [
    { title: "Total Tickets", value: stats?.totalTickets, icon: TicketIcon },
    { title: "Open Tickets", value: stats?.openTickets, icon: CircleDot },
    { title: "Resolved by AI", value: stats?.resolvedByAI, icon: Sparkles },
    {
      title: "AI Resolution Rate",
      value: stats ? `${stats.aiResolutionRate}%` : undefined,
      icon: TrendingUp,
    },
    {
      title: "Avg Resolution Time",
      value: stats ? formatDuration(stats.avgResolutionTime) : undefined,
      icon: Clock,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className=""
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">
                  {card.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tickets Per Day</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {volumeError ? (
            <ErrorAlert
              error={volumeError}
              fallback="Failed to load chart data"
            />
          ) : volumeLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={volume?.data}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => {
                    const d = new Date(value + "T00:00:00");
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value: string) => {
                        const d = new Date(value + "T00:00:00");
                        return d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="tickets"
                  fill="var(--color-tickets)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
