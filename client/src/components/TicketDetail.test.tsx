import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Ticket } from "core/constants/ticket.ts";
import TicketDetail from "./TicketDetail";

const mockTicket: Ticket = {
  id: 1,
  subject: "Cannot login to my account",
  body: "I need help logging in",
  bodyHtml: null,
  status: "open",
  category: "technical_question",
  senderName: "Alice Smith",
  senderEmail: "alice@example.com",
  assignedTo: null,
  createdAt: "2025-03-01T10:00:00.000Z",
  updatedAt: "2025-03-01T12:00:00.000Z",
};

describe("TicketDetail", () => {
  it("should display the ticket subject", () => {
    render(<TicketDetail ticket={mockTicket} />);

    expect(
      screen.getByRole("heading", { name: "Cannot login to my account" })
    ).toBeInTheDocument();
  });

  it("should display sender name and email", () => {
    render(<TicketDetail ticket={mockTicket} />);

    expect(
      screen.getByText(/Alice Smith \(alice@example\.com\)/)
    ).toBeInTheDocument();
  });

  it("should display created and updated dates", () => {
    render(<TicketDetail ticket={mockTicket} />);

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  it("should render the plain text body when bodyHtml is null", () => {
    render(<TicketDetail ticket={mockTicket} />);

    expect(screen.getByText("I need help logging in")).toBeInTheDocument();
  });

  it("should render HTML body when bodyHtml is present", () => {
    const htmlTicket: Ticket = {
      ...mockTicket,
      bodyHtml: "<p>Hello <strong>world</strong></p>",
    };
    render(<TicketDetail ticket={htmlTicket} />);

    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.queryByText("I need help logging in")).not.toBeInTheDocument();
  });

  it("should display the ticket body content", () => {
    render(<TicketDetail ticket={mockTicket} />);

    expect(screen.getByText("I need help logging in")).toBeInTheDocument();
  });
});
