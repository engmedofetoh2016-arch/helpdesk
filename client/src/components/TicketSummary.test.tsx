import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { renderWithQuery } from "@/test/render";
import TicketSummary from "./TicketSummary";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, { deep: true });

const TICKET_ID = 42;

beforeEach(() => {
  vi.resetAllMocks();
});

function renderSummary() {
  const user = userEvent.setup();
  renderWithQuery(<TicketSummary ticket={{ id: TICKET_ID }} />);
  return { user };
}

describe("TicketSummary", () => {
  it("should render Summarize button", () => {
    renderSummary();

    expect(screen.getByRole("button", { name: "Summarize" })).toBeInTheDocument();
  });

  it("should not show summary card before clicking", () => {
    renderSummary();

    expect(screen.queryByText("Summary")).not.toBeInTheDocument();
  });

  it("should call POST /api/tickets/:ticketId/replies/summarize on click", async () => {
    mockedAxios.post.mockResolvedValue({ data: { summary: "A summary" } });
    const { user } = renderSummary();

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/replies/summarize`
      );
    });
  });

  it("should display summary text on success", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { summary: "Customer asked about refund. Agent provided instructions." },
    });
    const { user } = renderSummary();

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(
        screen.getByText("Customer asked about refund. Agent provided instructions.")
      ).toBeInTheDocument();
    });
  });

  it("should show 'Summarizing...' while loading", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderSummary();

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Summarizing..." });
      expect(button).toBeDisabled();
    });
  });

  it("should show error on failure", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Service unavailable"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    const { user } = renderSummary();

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to generate summary")).toBeInTheDocument();
    });
  });

  it("should re-generate summary on subsequent clicks", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { summary: "First summary" } })
      .mockResolvedValueOnce({ data: { summary: "Updated summary" } });
    const { user } = renderSummary();

    await user.click(screen.getByRole("button", { name: "Summarize" }));
    await waitFor(() => {
      expect(screen.getByText("First summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Summarize" }));
    await waitFor(() => {
      expect(screen.getByText("Updated summary")).toBeInTheDocument();
    });
  });
});
