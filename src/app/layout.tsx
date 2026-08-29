import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
