import { format } from "date-fns";
import { env } from "@/lib/env";
import { renderEmail, type RenderedEmail } from "@/server/email/layout";

/** All transactional email templates. Each returns subject + HTML + text. */

const appUrl = (path: string) => new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
const formatDateTime = (date: Date) => format(date, "EEE, d MMM yyyy 'at' h:mm a");

export function otpVerificationEmail(input: { name: string; code: string; ttlMinutes: number }): RenderedEmail {
  return renderEmail({
    subject: `${input.code} is your CampusOS verification code`,
    preheader: `Your verification code expires in ${input.ttlMinutes} minutes.`,
    heading: "Verify your email",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, welcome to CampusOS! Enter this code to verify your email address:` },
      { kind: "code", code: input.code, caption: `Expires in ${input.ttlMinutes} minutes` },
      { kind: "note", text: "If you didn't create a CampusOS account, you can safely ignore this email." },
    ],
  });
}

export function passwordResetEmail(input: { name: string; code: string; ttlMinutes: number }): RenderedEmail {
  return renderEmail({
    subject: `${input.code} is your CampusOS password reset code`,
    preheader: "Use this code to reset your password.",
    heading: "Reset your password",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, we received a request to reset your password. Use this code:` },
      { kind: "code", code: input.code, caption: `Expires in ${input.ttlMinutes} minutes` },
      { kind: "note", text: "Didn't request this? Ignore this email - your password stays unchanged." },
    ],
  });
}

export function welcomeEmail(input: { name: string }): RenderedEmail {
  return renderEmail({
    subject: "Welcome to CampusOS 🎓",
    preheader: "Your account is verified. Here's what you can do.",
    heading: `Welcome aboard, ${input.name}!`,
    blocks: [
      { kind: "paragraph", text: "Your email is verified and your CampusOS account is ready. Everything at City University, in one place:" },
      { kind: "paragraph", text: "• Discover and register for club events with QR tickets\n• Find notes and previous question papers\n• Check notices and bus schedules\n• Report lost items and track complaints" },
      { kind: "button", label: "Open CampusOS", url: appUrl("/dashboard") },
    ],
  });
}

export function passwordChangedEmail(input: { name: string; changedAt: Date }): RenderedEmail {
  return renderEmail({
    subject: "Your CampusOS password was changed",
    preheader: "Security notice for your account.",
    heading: "Password changed",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, the password for your CampusOS account was changed on ${formatDateTime(input.changedAt)}. You have been signed out on all other devices.` },
      { kind: "note", text: "If this wasn't you, reset your password immediately and contact the CampusOS admin team." },
      { kind: "button", label: "Reset password", url: appUrl("/forgot-password") },
    ],
  });
}

export function eventRegistrationEmail(input: {
  name: string;
  eventTitle: string;
  startAt: Date;
  venue: string;
  qrImageUrl: string;
  ticketUrl: string;
}): RenderedEmail {
  return renderEmail({
    subject: `You're registered: ${input.eventTitle}`,
    preheader: `Your QR ticket for ${input.eventTitle}.`,
    heading: "You're in! 🎉",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, your registration is confirmed. Show this QR code at the entrance for check-in.` },
      { kind: "details", rows: [["Event", input.eventTitle], ["When", formatDateTime(input.startAt)], ["Venue", input.venue]] },
      { kind: "image", src: input.qrImageUrl, alt: "Your event QR ticket", width: 220 },
      { kind: "button", label: "View ticket", url: input.ticketUrl },
    ],
  });
}

export function complaintReceivedEmail(input: { name: string; ticketNo: string; subject: string }): RenderedEmail {
  return renderEmail({
    subject: `Complaint received - ${input.ticketNo}`,
    preheader: `We've logged your complaint as ${input.ticketNo}.`,
    heading: "We've received your complaint",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, thank you for reaching out. Your complaint has been logged and will be reviewed by the responsible office.` },
      { kind: "details", rows: [["Ticket", input.ticketNo], ["Subject", input.subject], ["Status", "Received"]] },
      { kind: "button", label: "Track your complaint", url: appUrl(`/complaints/${encodeURIComponent(input.ticketNo)}`) },
    ],
  });
}

const CLAIM_STATUS_COPY = {
  APPROVED: "Your claim was approved. Please collect the item from the admin office with your student ID.",
  REJECTED: "Your claim could not be verified. If you believe this is a mistake, contact the admin office.",
  PENDING: "Your claim is pending review. We'll notify you once it's verified.",
} as const;

export function lostFoundClaimUpdateEmail(input: {
  name: string;
  itemTitle: string;
  status: keyof typeof CLAIM_STATUS_COPY;
  itemId: string;
}): RenderedEmail {
  return renderEmail({
    subject: `Claim update: ${input.itemTitle}`,
    preheader: `Your claim is now ${input.status.toLowerCase()}.`,
    heading: "Lost & Found claim update",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name},` },
      { kind: "details", rows: [["Item", input.itemTitle], ["Status", input.status]] },
      { kind: "paragraph", text: CLAIM_STATUS_COPY[input.status] },
      { kind: "button", label: "View item", url: appUrl(`/lost-found/${encodeURIComponent(input.itemId)}`) },
    ],
  });
}
