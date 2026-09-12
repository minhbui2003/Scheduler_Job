import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/providers/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Scheduler Job — Quản lý lịch phỏng vấn & Hồ sơ ứng tuyển",
    template: "%s | Scheduler Job",
  },
  description:
    "Giải pháp toàn diện giúp theo dõi hồ sơ xin việc, sắp xếp lịch phỏng vấn theo tuần, đánh giá buổi hẹn và tự động trích xuất thông tin với AI.",
  keywords: [
    "Scheduler Job",
    "quản lý lịch phỏng vấn",
    "quản lý hồ sơ xin việc",
    "interview scheduler",
    "job application tracker",
    "nhắc lịch phỏng vấn",
    "ai extract interview",
  ],
  authors: [{ name: "Scheduler Job Team" }],
  creator: "Scheduler Job",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title: "Scheduler Job — Personal Interview Workspace",
    description:
      "Giải pháp toàn diện giúp theo dõi hồ sơ xin việc, sắp xếp lịch phỏng vấn theo tuần, đánh giá buổi hẹn và tự động trích xuất thông tin với AI.",
    siteName: "Scheduler Job",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scheduler Job — Personal Interview Workspace",
    description:
      "Quản lý lịch phỏng vấn & theo dõi hồ sơ ứng tuyển thông minh hỗ trợ bởi AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
