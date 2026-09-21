import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://randomchat.lol"),

  title: {
    default: "RandomChat - Talk to Strangers Online",
    template: "%s | RandomChat",
  },

  description:
    "RandomChat is a free online platform for random 1-to-1 text and video chat. Meet new people and start conversations with strangers online.",

  keywords: [
    "random chat",
    "random chat online",
    "talk to strangers",
    "chat with strangers",
    "random video chat",
    "random text chat",
    "meet new people online",
    "1 to 1 video chat",
  ],

  alternates: {
    canonical: "https://randomchat.lol",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "RandomChat - Talk to Strangers Online",
    description:
      "Meet new people and talk with strangers through random 1-to-1 text and video chat.",
    url: "https://randomchat.lol",
    siteName: "RandomChat",
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "RandomChat - Talk to Strangers Online",
    description:
      "Meet new people through random 1-to-1 text and video chat.",
  },

  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}