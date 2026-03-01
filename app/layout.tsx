import type { Metadata } from "next";
import { Inter, Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { PWAInitializer } from "@/components/pwa-initializer";
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VTS Chat 💲 🔤 📖",
  description: "VTS Chat (vtschat.app) is a secure real-time collaboration platform with organized channels, admin-curated spaces, and private community messaging.",
  keywords: ["chat app", "messaging platform", "real-time chat", "team communication", "VTS Chat", "VTSChat", "vtschat.app"],
  authors: [{ name: "VTS Chat" }],
  creator: "VTS Chat",
  publisher: "VTS Chat",
  metadataBase: new URL("https://vtschat.app"),
  alternates: {
    canonical: "https://vtschat.app",
  },
  openGraph: {
    title: "VTS Chat 💲 🔤 📖",
    description: "VTS Chat (vtschat.app) is a secure real-time collaboration platform with organized channels, admin-curated spaces, and private community messaging.",
    url: "https://vtschat.app",
    siteName: "VTS Chat 💲 🔤 📖",
    images: [
      {
        url: "/vts-logo-brand.png",
        width: 1200,
        height: 630,
        alt: "VTS Chat",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VTS Chat 💲 🔤 📖",
    description: "VTS Chat (vtschat.app) is a secure real-time collaboration platform with organized channels, admin-curated spaces, and private community messaging.",
    images: ["/vts-logo-brand.png"],
    creator: "@vtschat",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VTS Chat",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "VTS Chat",
      "alternateName": ["VTSChat", "vtschat", "vtschat.app", "VTSCHAT.APP"],
      "applicationCategory": "CommunicationApplication",
      "operatingSystem": "Web",
      "url": "https://vtschat.app",
      "description": "VTS Chat (vtschat.app) is a secure real-time collaboration platform with organized channels, admin-curated spaces, and private community messaging."
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "VTS Chat",
      "url": "https://vtschat.app"
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${outfit.variable} antialiased font-sans`}
      >
        <PWAInitializer />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
