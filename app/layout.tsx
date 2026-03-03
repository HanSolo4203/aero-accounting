import type { Metadata } from "next";
import "./globals.css";
import { BankAccountsProvider } from "@/contexts/BankAccountsContext";

export const metadata: Metadata = {
  title: "Right Stay Africa - Accounting Engine",
  description: "Double-entry accounting for property management — CSV in, ledger out",
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
