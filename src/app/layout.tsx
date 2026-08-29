import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "PACO LegalBook — Ebook & Thư Viện Pháp Luật Số",
  description: "Hệ thống tra cứu và quản lý văn bản pháp luật thông minh dành cho doanh nghiệp, kế toán, kiểm toán, thuế và pháp chế Việt Nam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
