import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if ((session.user.subscription_count ?? 0) > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
