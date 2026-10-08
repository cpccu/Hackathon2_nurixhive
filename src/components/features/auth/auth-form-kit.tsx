"use client";

import { type ComponentProps, useCallback, useEffect, useRef } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { api, fieldErrors } from "@/lib/api-client";

interface FormTokenResponse {
  formToken: string;
  minAgeSeconds: number;
  maxAgeSeconds: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bot protection, invisible to humans: fetches a signed render-time token on
 * mount and, at submit, waits out the minimum age (bots submit instantly) or
 * fetches a fresh token if the old one expired.
 */
export function useFormToken() {
  const state = useRef<{ token: string; issuedAt: number; minMs: number; maxMs: number } | null>(null);
  const pending = useRef<Promise<void> | null>(null);

  const load = useCallback(() => {
    pending.current = api
      .get<FormTokenResponse>("/api/security/form-token", { notifyUnauthorized: false })
      .then((data) => {
        state.current = { token: data.formToken, issuedAt: Date.now(), minMs: data.minAgeSeconds * 1000, maxMs: data.maxAgeSeconds * 1000 };
      })
      .catch(() => {
        state.current = null;
      });
    return pending.current;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Resolves to a valid token (or undefined if the endpoint is unreachable - the server then reports it). */
  return useCallback(async (): Promise<string | undefined> => {
    if (pending.current) await pending.current;
    if (!state.current || Date.now() - state.current.issuedAt > state.current.maxMs - 5_000) {
      await load();
    }
    const current = state.current;
    if (!current) return undefined;
    const wait = current.minMs + 150 - (Date.now() - current.issuedAt);
    if (wait > 0) await sleep(wait);
    return current.token;
  }, [load]);
}

/**
 * Honeypot field. Humans never see or tab to it; naive bots fill every input.
 * Register it with react-hook-form as `website`.
 */
export function Honeypot(props: ComponentProps<"input">) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
}

/** Copies server VALIDATION_ERROR details onto form fields; returns true if any matched. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: ReadonlyArray<Path<T>>): boolean {
  const errors = fieldErrors(error);
  let matched = false;
  for (const field of fields) {
    const message = errors[field];
    if (message) {
      setError(field, { type: "server", message }, { shouldFocus: !matched });
      matched = true;
    }
  }
  return matched;
}

/** Only allow same-site relative paths as post-login destinations (no open redirects). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/signup") || value.startsWith("/api")) return fallback;
  return value;
}
