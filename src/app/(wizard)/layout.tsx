import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
