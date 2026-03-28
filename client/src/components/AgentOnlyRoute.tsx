import { Navigate, Outlet } from "react-router";
import { Role } from "core/constants/role.ts";
import { useSession } from "../lib/auth-client";

/** Customers are redirected to /portal. */
export default function AgentOnlyRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (session?.user?.role === Role.customer) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
