import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { Toaster } from "sonner";

export const metadata = {
  title: "Client Admin Dashboard",
  description: "Administrative dashboard for sportsbook operators",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AdminAuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AdminAuthProvider>
      </body>
    </html>
  );
}
