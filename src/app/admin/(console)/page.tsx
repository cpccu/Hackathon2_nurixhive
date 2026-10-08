import { redirect } from "next/navigation";

/** /admin redirects to /admin/dashboard */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
