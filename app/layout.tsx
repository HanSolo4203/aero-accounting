import type { Metadata } from "next";
import "./globals.css";
import { BankAccountsProvider } from "@/contexts/BankAccountsContext";

export const metadata: Metadata = {
  title: "Simple Accounting",
  description: "Simple accounting app for managing bank statements",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BankAccountsProvider>{children}</BankAccountsProvider>
      </body>
    </html>
  );
}
