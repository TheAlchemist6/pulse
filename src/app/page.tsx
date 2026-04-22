import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    // Check if user has imported — if not, send to /welcome to trigger import
    const [dbUser] = await db
      .select({ subscriptionCount: users.subscriptionCount })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (dbUser && dbUser.subscriptionCount > 0) {
      redirect("/dashboard");
    } else {
      redirect("/welcome");
    }
  }

  return <LandingPage />;
}
