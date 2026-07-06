import type { Metadata } from "next";
import { Inter, Albert_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const albert = Albert_Sans({ subsets: ["latin"], variable: "--font-albert", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vyuha-os.app"),
  title: {
    default: "Vyuha OS — Run Your Entire Business by Talking to AI",
    template: "%s · Vyuha OS",
  },
  description:
    "Vyuha OS is an AI operating system for small and medium businesses. Replace your CRM, ERP, inventory, HR, finance, and analytics tools with one AI-driven platform you run by talking to it.",
  keywords: [
    "AI business software",
    "SME ERP",
    "AI CRM",
    "inventory management",
    "AI copilot",
    "business operating system",
  ],
  openGraph: {
    title: "Vyuha OS — Run Your Entire Business by Talking to AI",
    description:
      "One AI-driven platform for CRM, inventory, finance, HR, projects and analytics. Run your business by talking to it.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${albert.variable}`}>
      <body className="font-sans text-base antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-card !text-card-foreground !border-border !shadow-overlay !rounded-md",
                description: "!text-muted-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
