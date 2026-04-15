import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={session.user} />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}
