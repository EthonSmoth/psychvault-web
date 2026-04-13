import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import { hasAdminAccess } from "@/lib/super-admin";

export async function requireAdmin() {
  const user = await requireAuth({
    redirectOnFail: true,
    redirectTo: "/admin",
  });

  if (!hasAdminAccess(user)) {
    redirect("/");
  }

  return user;
}
