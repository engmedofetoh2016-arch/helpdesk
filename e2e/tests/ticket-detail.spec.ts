import { test, expect, type APIRequestContext } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import type { InboundEmailInput } from "core/schemas/tickets.ts";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;
const API_BASE_URL = process.env.BETTER_AUTH_URL!;

/**
 * Creates a ticket via the inbound email webhook and returns the ticket object.
 */
async function createTicketViaWebhook(
  request: APIRequestContext,
  payload: InboundEmailInput
) {
  const from = payload.fromName?.trim()
    ? `${payload.fromName} <${payload.from}>`
    : payload.from;
  const response = await request.post(
    `${API_BASE_URL}/api/webhooks/inbound-email`,
    {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      multipart: {
        from,
        subject: payload.subject,
        text: payload.body,
        ...(payload.bodyHtml ? { html: payload.bodyHtml } : {}),
      },
    }
  );
  expect(response.status()).toBe(201);
  const body = await response.json();
  return body.ticket as {
    id: number;
    subject: string;
    senderName: string;
    senderEmail: string;
    body: string;
    bodyHtml: string | null;
    status: string;
    category: string | null;
  };
}

/**
 * Builds a unique inbound-email payload so tests don't collide with each other.
 */
function createTestPayload(
  uniqueId: string,
  overrides?: Partial<InboundEmailInput>
): InboundEmailInput {
  return {
    from: `sender-${uniqueId}@example.com`,
    fromName: `Test Sender ${uniqueId}`,
    subject: `Test Subject ${uniqueId}`,
    body: `This is the body of ticket ${uniqueId}`,
    ...overrides,
  };
}

test.describe("Ticket Detail Page", () => {
  test("should redirect unauthenticated user to login", async ({
    page,
    request,
  }) => {
    const uniqueId = `nav-unauth-${Date.now()}`;
    const ticket = await createTicketViaWebhook(
      request,
      createTestPayload(uniqueId)
    );

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page).toHaveURL("/login");
  });

  test("should persist ticket updates after page reload", async ({
    page,
    request,
  }) => {
    const uniqueId = `persist-updates-${Date.now()}`;
    const ticket = await createTicketViaWebhook(
      request,
      createTestPayload(uniqueId)
    );

    await loginAsAdmin(page);
    await page.request.patch(`${API_BASE_URL}/api/tickets/${ticket.id}`, {
      data: { status: "open" },
    });
    await page.goto(`/tickets/${ticket.id}`);

    // Update status
    const statusPatch = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}`) &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200
    );
    await page.getByRole("combobox").filter({ hasText: "Open" }).click();
    await page.getByRole("option", { name: /^Resolved$/ }).click();
    await statusPatch;

    // Update category
    const categoryPatch = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}`) &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200
    );
    await page.getByRole("combobox").filter({ hasText: "None" }).click();
    await page.getByRole("option", { name: /^Technical$/ }).click();
    await categoryPatch;

    // Update assignment
    const assignPatch = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}`) &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200
    );
    await page.getByRole("combobox").nth(2).click();
    await page.getByRole("option", { name: /^Admin$/ }).click();
    await assignPatch;

    // Reload and verify all changes persisted
    await page.reload();

    await expect(
      page.getByRole("combobox").filter({ hasText: "Resolved" })
    ).toBeVisible();
    await expect(
      page.getByRole("combobox").filter({ hasText: "Technical" })
    ).toBeVisible();
    await expect(
      page.getByRole("combobox").filter({ hasText: "Admin" })
    ).toBeVisible();
  });

  test("should persist replies after page reload", async ({
    page,
    request,
  }) => {
    const uniqueId = `persist-reply-${Date.now()}`;
    const ticket = await createTicketViaWebhook(
      request,
      createTestPayload(uniqueId)
    );

    await loginAsAdmin(page);
    await page.goto(`/tickets/${ticket.id}`);

    const replyText = `Persisted reply for ${uniqueId}`;

    const postPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    await page.getByPlaceholder(/type your reply/i).fill(replyText);
    await page.getByRole("button", { name: /send reply/i }).click();
    await postPromise;

    await page.reload();

    await expect(page.getByText(replyText)).toBeVisible();
  });

  test("should complete full agent workflow: navigate, view, update, reply, and return to list", async ({
    page,
    request,
  }) => {
    const uniqueId = `workflow-${Date.now()}`;
    const payload = createTestPayload(uniqueId, {
      body: `Customer question for ${uniqueId}`,
    });
    const ticket = await createTicketViaWebhook(request, payload);

    await loginAsAdmin(page);
    await page.request.patch(`${API_BASE_URL}/api/tickets/${ticket.id}`, {
      data: { status: "open" },
    });

    // Navigate from list to detail
    await page.goto("/tickets");
    const subjectLink = page.getByRole("link", {
      name: ticket.subject,
      exact: true,
    });
    await expect(subjectLink).toBeVisible();
    await subjectLink.click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);

    // Verify ticket details
    await expect(
      page.getByRole("heading", { name: ticket.subject })
    ).toBeVisible();
    const fromRow = page.locator("div").filter({ hasText: /^From:\s/ });
    await expect(fromRow.first()).toContainText(ticket.senderName);
    await expect(fromRow.first()).toContainText(ticket.senderEmail);
    await expect(page.getByText(ticket.body, { exact: true })).toBeVisible();

    // Update status
    const statusPatch = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}`) &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200
    );
    await page.getByRole("combobox").filter({ hasText: "Open" }).click();
    await page.getByRole("option", { name: /^Resolved$/ }).click();
    await statusPatch;
    await expect(
      page.getByRole("combobox").filter({ hasText: "Resolved" })
    ).toBeVisible();

    // Update category
    const categoryPatch = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}`) &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200
    );
    await page.getByRole("combobox").filter({ hasText: "None" }).click();
    await page.getByRole("option", { name: /^Technical$/ }).click();
    await categoryPatch;
    await expect(
      page.getByRole("combobox").filter({ hasText: "Technical" })
    ).toBeVisible();

    // Add a reply
    const replyText = `Agent resolution note for ${uniqueId}`;
    const postPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await page.getByPlaceholder(/type your reply/i).fill(replyText);
    await page.getByRole("button", { name: /send reply/i }).click();
    await postPromise;
    await expect(page.getByText(replyText)).toBeVisible();

    // Navigate back to list
    await page.getByRole("link", { name: /back to tickets/i }).click();
    await expect(page).toHaveURL("/tickets");
  });
});
