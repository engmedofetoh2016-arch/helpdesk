import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { renderWithQuery } from "@/test/render";
import UserForm from "./UserForm";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, { deep: true });

const onSuccess = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
});

function renderForm(user?: { id: string; name: string; email: string }) {
  const actor = userEvent.setup();
  renderWithQuery(<UserForm user={user} onSuccess={onSuccess} />);
  return { user: actor };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { name = "John Doe", email = "john@example.com", password = "password123" } = {}
) {
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  if (password) {
    await user.type(screen.getByLabelText("Password"), password);
  }
}

describe("UserForm — create mode", () => {
  it("should render all form fields and submit button", () => {
    renderForm();

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create User" })).toBeInTheDocument();
  });

  it("should show validation error for short name", async () => {
    const { user } = renderForm();

    await fillForm(user, { name: "Ab" });
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("should show validation error for short password", async () => {
    const { user } = renderForm();

    await fillForm(user, { password: "short" });
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("should show validation error for missing email", async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("should set aria-invalid on fields with errors", async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("should call POST /api/users with form data on valid submit", async () => {
    mockedAxios.post.mockResolvedValue({ data: { user: { id: "1" } } });
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/users", {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });
    });
  });

  it("should call onSuccess after successful creation", async () => {
    mockedAxios.post.mockResolvedValue({ data: { user: { id: "1" } } });
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("should reset the form after successful creation", async () => {
    mockedAxios.post.mockResolvedValue({ data: { user: { id: "1" } } });
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("");
      expect(screen.getByLabelText("Email")).toHaveValue("");
      expect(screen.getByLabelText("Password")).toHaveValue("");
    });
  });

  it("should display server error message on 409 conflict", async () => {
    const error = new Error("Conflict");
    Object.assign(error, {
      response: { status: 409, data: { error: "Email already exists" } },
    });
    mockedAxios.post.mockRejectedValue(error);
    mockedAxios.isAxiosError.mockReturnValue(true);
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("should show generic error for non-Axios errors", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network failure"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create user")).toBeInTheDocument();
    });
  });

  it("should show 'Creating...' and disable button while submitting", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Creating..." });
      expect(button).toBeDisabled();
    });
  });
});

describe("UserForm — edit mode", () => {
  const existingUser = { id: "u1", name: "Alice", email: "alice@example.com" };

  it("should pre-populate name and email fields", () => {
    renderForm(existingUser);

    expect(screen.getByLabelText("Name")).toHaveValue("Alice");
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("should show 'Save Changes' button in edit mode", () => {
    renderForm(existingUser);

    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("should show password placeholder for edit mode", () => {
    renderForm(existingUser);

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "placeholder",
      "Leave blank to keep current"
    );
  });

  it("should allow submitting with empty password in edit mode", async () => {
    mockedAxios.put.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { user } = renderForm(existingUser);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Alice Updated");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/users/u1", {
        name: "Alice Updated",
        email: "alice@example.com",
        password: "",
      });
    });
  });

  it("should call PUT /api/users/:id with password when provided", async () => {
    mockedAxios.put.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { user } = renderForm(existingUser);

    await user.type(screen.getByLabelText("Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/users/u1", {
        name: "Alice",
        email: "alice@example.com",
        password: "newpassword123",
      });
    });
  });

  it("should call onSuccess after successful update", async () => {
    mockedAxios.put.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { user } = renderForm(existingUser);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("should show 'Saving...' and disable button while submitting", async () => {
    mockedAxios.put.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm(existingUser);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Saving..." });
      expect(button).toBeDisabled();
    });
  });

  it("should show validation error for short password in edit mode", async () => {
    const { user } = renderForm(existingUser);

    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
    expect(mockedAxios.put).not.toHaveBeenCalled();
  });

  it("should display server error message on update failure", async () => {
    const error = new Error("Conflict");
    Object.assign(error, {
      response: { status: 409, data: { error: "Email already exists" } },
    });
    mockedAxios.put.mockRejectedValue(error);
    mockedAxios.isAxiosError.mockReturnValue(true);
    const { user } = renderForm(existingUser);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });
});
