import { after } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { RenderedEmail } from "@/server/email/layout";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

export interface EmailRecipient {
  email: string;
  name?: string;
}

export type SendEmailResult = { ok: true; messageId?: string } | { ok: false; reason: string };

/** Network errors and 429/5xx are transient; other 4xx (bad payload/key) are not. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postToBrevo(payload: string): Promise<Response> {
  return fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: payload,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * Sends a transactional email through Brevo. Never throws: failures are logged
 * (without the email body, which may hold an OTP) and returned as `{ ok: false }`
 * so callers can respond safely. Transient failures are retried once.
 *
 * Retry-safety: callers only send content that is safe to deliver twice
 * (a re-sent OTP supersedes the previous one).
 */
export async function sendEmail(
  to: EmailRecipient,
  email: RenderedEmail,
  tag: string,
): Promise<SendEmailResult> {
  const payload = JSON.stringify({
    sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
    to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
    subject: email.subject,
    htmlContent: email.html,
    textContent: email.text,
    tags: [tag],
  });

  let reason = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await postToBrevo(payload);
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { messageId?: string };
        return { ok: true, messageId: body.messageId };
      }
      reason = `brevo_status_${response.status}`;
      if (!isRetryableStatus(response.status)) break;
    } catch (error) {
      reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error";
    }
    if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS * attempt);
  }

  logger.error("Email delivery failed", { tag, reason });
  return { ok: false, reason };
}

/**
 * Sends a non-critical notification (welcome, password changed...) after the
 * response has been flushed, so it adds no latency and cannot fail the request.
 * Only callable from Route Handlers / Server Actions.
 */
export function sendEmailAfterResponse(to: EmailRecipient, render: () => RenderedEmail, tag: string): void {
  after(async () => {
    await sendEmail(to, render(), tag);
  });
}
