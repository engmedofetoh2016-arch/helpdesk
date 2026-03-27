import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { renderWithQuery } from "@/test/render";
import ReplyForm from "./ReplyForm";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, { deep: true });

const TICKET_ID = 42;

beforeEach(() => {
  vi.resetAllMocks();
});

function renderForm() {
  const user = userEvent.setup();
  renderWithQuery(<ReplyForm ticket={{ id: TICKET_ID }} />);
  return { user };
}

describe("ReplyForm", () => {
  it("should render textarea, Polish button, and Send Reply button", () => {
    renderForm();

    expect(screen.getByPlaceholderText("Type your reply...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Polish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
  });

  it("should disable Send Reply button when textarea is empty", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled();
  });

  it("should disable Polish button when textarea is empty", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();
  });

  it("should enable both buttons when text is entered", async () => {
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");

    expect(screen.getByRole("button", { name: "Send Reply" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Polish" })).toBeEnabled();
  });

  it("should disable both buttons when text is only whitespace", async () => {
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "   ");

    expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();
  });

  it("should call POST /api/tickets/:ticketId/replies with body on valid submit", async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 1, body: "Hello" } });
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/replies`,
        { body: "Hello" }
      );
    });
  });

  it("should clear the textarea after successful submission", async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 1, body: "Hello" } });
    const { user } = renderForm();

    const textarea = screen.getByPlaceholderText("Type your reply...");
    await user.type(textarea, "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("should show 'Sending...' and disable button while submitting", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Sending..." });
      expect(button).toBeDisabled();
    });
  });

  it("should display server error message from Axios response", async () => {
    const error = new Error("Bad Request");
    Object.assign(error, {
      response: { status: 400, data: { error: "Ticket not found" } },
    });
    mockedAxios.post.mockRejectedValue(error);
    mockedAxios.isAxiosError.mockReturnValue(true);
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(screen.getByText("Ticket not found")).toBeInTheDocument();
    });
  });

  it("should show generic error for non-Axios errors", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network failure"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to send reply")).toBeInTheDocument();
    });
  });

  it("should not show error alert before submission", () => {
    renderForm();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ReplyForm - Polish", () => {
  it("should call POST /api/tickets/:ticketId/replies/polish with body", async () => {
    mockedAxios.post.mockResolvedValue({ data: { body: "Polished text" } });
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "rough draft");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/replies/polish`,
        { body: "rough draft" }
      );
    });
  });

  it("should replace textarea content with polished text on success", async () => {
    mockedAxios.post.mockResolvedValue({ data: { body: "Polished text" } });
    const { user } = renderForm();

    const textarea = screen.getByPlaceholderText("Type your reply...");
    await user.type(textarea, "rough draft");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(textarea).toHaveValue("Polished text");
    });
  });

  it("should show 'Polishing...' and disable button while polishing", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Polishing..." });
      expect(button).toBeDisabled();
    });
  });

  it("should disable Send Reply button while polishing", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled();
    });
  });

  it("should disable Polish button while sending reply", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();
    });
  });

  it("should show error when polish request fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("AI service unavailable"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to polish reply")).toBeInTheDocument();
    });
  });

  it("should not clear textarea when polish fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("AI service unavailable"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    const { user } = renderForm();

    const textarea = screen.getByPlaceholderText("Type your reply...");
    await user.type(textarea, "my draft");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to polish reply")).toBeInTheDocument();
    });
    expect(textarea).toHaveValue("my draft");
  });

  it("should allow sending the polished reply", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { body: "Polished text" } })
      .mockResolvedValueOnce({ data: { id: 1, body: "Polished text" } });
    const { user } = renderForm();

    await user.type(screen.getByPlaceholderText("Type your reply..."), "rough draft");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type your reply...")).toHaveValue("Polished text");
    });

    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/replies`,
        { body: "Polished text" }
      );
    });
  });
});
