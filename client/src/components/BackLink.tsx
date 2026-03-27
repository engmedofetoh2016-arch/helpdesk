import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  to: string;
  children: React.ReactNode;
}

export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
