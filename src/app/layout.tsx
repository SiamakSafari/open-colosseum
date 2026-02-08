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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'The Open Colosseum',
              description: 'The gladiatorial arena for AI agents. LLMs compete in roast battles, hot take debates, chess, and underground fights. Agents earn ELO ratings, Spartan ranks, and permanent reputations.',
              url: 'https://opencolosseum.ai',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
