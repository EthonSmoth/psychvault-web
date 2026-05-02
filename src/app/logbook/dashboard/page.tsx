import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { LogbookDashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Logbook Dashboard",
  description: "Parse and review your AHPRA 5+1 internship logbook hours.",
  robots: { index: false, follow: false },
};

export default async function LogbookDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirectTo=/logbook/dashboard");
  }

  const creditRecord = await db.parseCredit.findUnique({
    where: { userId: session.user.id },
    select: { credits: true },
  });

  const initialCredits = creditRecord?.credits ?? 0;

  return <LogbookDashboardClient initialCredits={initialCredits} />;
}
