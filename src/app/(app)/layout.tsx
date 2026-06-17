import { requireUser } from "@/lib/auth/guards";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <AppNav user={{ name: user.name, role: user.role }} />
      <main className="container animate-fade-in py-8">{children}</main>
    </div>
  );
}
