import { redirect } from "next/navigation";
import { requireAuth, requireRole } from "@/lib/auth-guards";

export async function requireAdmin() {
  const user = await requireAuth({
    redirectOnFail: true,
    redirectTo: "/admin",
  });

  try {
    requireRole(user, "ADMIN");
  } catch {
    redirect("/");
  }

  return user;
}
