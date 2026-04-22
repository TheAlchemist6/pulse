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

  // Serialize user data to plain object — no functions or class instances
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    avatar_url: session.user.avatar_url ?? null,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={user} />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}
