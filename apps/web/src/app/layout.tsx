import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AstraOS",
  description: "AstraOS MVP local development shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
