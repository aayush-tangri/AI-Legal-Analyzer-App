import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "LawLight",
  description: "Understand rental, employment and loan agreements in plain English.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'white',
              color: 'var(--color-gray-900)',
              border: '1px solid var(--color-gray-100)',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'var(--font-roboto)',
              boxShadow: '0 4px 8px 3px rgba(60, 64, 67, 0.15)',
            },
          }}
        />
        <VisualEditsMessenger />
      </body>
    </html>
  );
}