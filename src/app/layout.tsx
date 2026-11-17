import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusinessBridge | Experience Meets Ambition",
  description:
    "Connecting retired business executives and mentors with new entrepreneurs to build enduring ventures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
