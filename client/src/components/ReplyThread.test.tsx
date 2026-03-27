import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import type { Ticket } from "core/constants/ticket.ts";
import { renderWithQuery } from "@/test/render";
import ReplyThread from "./ReplyThread";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, { deep: true });

const mockTicket: Ticket = {
  id: 42,
  subject: "Cannot login to my account",
  body: "I need help logging in",
  bodyHtml: null,
  status: "open",
  category: "technical_question",
  senderName: "Alice Smith",
  senderEmail: "alice@example.com",
  assignedTo: null,
  createdAt: "2025-03-01T10:00:00.000Z",
  updatedAt: "2025-03-01T10:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ReplyThread", () => {
  it("should show skeletons while loading", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBe(2);
  });

  it("should show 'No replies yet' when there are no replies", async () => {
    mockedAxios.get.mockResolvedValue({ data: { replies: [] } });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getByText("No replies yet")).toBeInTheDocument();
    });
  });

  it("should fetch replies for the ticket", async () => {
    mockedAxios.get.mockResolvedValue({ data: { replies: [] } });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/tickets/42/replies");
    });
  });

  it("should display an error message when the request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network Error"));
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load replies")).toBeInTheDocument();
    });
  });

  it("should display agent replies with the agent's name", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        replies: [
          {
            id: 1,
            body: "I can help with that",
            senderType: "agent",
            user: { id: "agent-1", name: "Jane Doe" },
            createdAt: "2025-03-01T11:00:00.000Z",
          },
        ],
      },
    });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("I can help with that")).toBeInTheDocument();
    expect(screen.getAllByText(/Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("should display customer replies with the ticket sender name", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        replies: [
          {
            id: 2,
            body: "Thanks for the help",
            senderType: "customer",
            user: null,
            createdAt: "2025-03-01T12:00:00.000Z",
          },
        ],
      },
    });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("Thanks for the help")).toBeInTheDocument();
    expect(screen.getByText(/Customer/)).toBeInTheDocument();
  });

  it("should fall back to 'Agent' when agent reply has no user", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        replies: [
          {
            id: 3,
            body: "Automated response",
            senderType: "agent",
            user: null,
            createdAt: "2025-03-01T13:00:00.000Z",
          },
        ],
      },
    });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getAllByText("Agent").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("Automated response")).toBeInTheDocument();
  });

  it("should display multiple replies", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        replies: [
          {
            id: 1,
            body: "First reply",
            senderType: "agent",
            user: { id: "agent-1", name: "Jane Doe" },
            createdAt: "2025-03-01T11:00:00.000Z",
          },
          {
            id: 2,
            body: "Second reply",
            senderType: "customer",
            user: null,
            createdAt: "2025-03-01T12:00:00.000Z",
          },
        ],
      },
    });
    renderWithQuery(<ReplyThread ticket={mockTicket} />);

    await waitFor(() => {
      expect(screen.getByText("First reply")).toBeInTheDocument();
    });
    expect(screen.getByText("Second reply")).toBeInTheDocument();
  });
});
