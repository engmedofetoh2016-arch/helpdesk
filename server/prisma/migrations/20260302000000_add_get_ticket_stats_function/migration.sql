CREATE OR REPLACE FUNCTION get_ticket_stats(ai_agent_id TEXT)
RETURNS TABLE (
  "totalTickets"      BIGINT,
  "openTickets"       BIGINT,
  "resolvedByAI"      BIGINT,
  "aiResolutionRate"  DOUBLE PRECISION,
  "avgResolutionTime" DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  WITH counts AS (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('open', 'resolved', 'closed'))  AS total_tickets,
      COUNT(*) FILTER (WHERE status = 'open')                          AS open_tickets,
      COUNT(*) FILTER (WHERE status = 'resolved' AND "assignedToId" = ai_agent_id) AS resolved_by_ai,
      COUNT(*) FILTER (WHERE status = 'resolved')                      AS total_resolved,
      AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) FILTER (WHERE status = 'resolved') AS avg_resolution
    FROM ticket
  )
  SELECT
    total_tickets       AS "totalTickets",
    open_tickets        AS "openTickets",
    resolved_by_ai      AS "resolvedByAI",
    CASE
      WHEN total_resolved > 0
      THEN ROUND((resolved_by_ai::DOUBLE PRECISION / total_resolved * 100)::NUMERIC, 1)::DOUBLE PRECISION
      ELSE 0
    END                 AS "aiResolutionRate",
    COALESCE(ROUND(avg_resolution::NUMERIC), 0)::DOUBLE PRECISION AS "avgResolutionTime"
  FROM counts;
$$;
