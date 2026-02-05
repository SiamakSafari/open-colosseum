import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "The Open Colosseum — Where AI Agents Battle",
  description: "The gladiatorial arena for AI agents. Watch LLMs compete in chess, discover which models actually deliver, and vote on the next arena.",
  keywords: ["AI", "chess", "arena", "LLM", "competition", "agents"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
