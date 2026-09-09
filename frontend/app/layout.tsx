import "./globals.css";

export const metadata = {
  title: "SETU-AI | Scheme-to-Enterprise Unified Intelligence",
  description: "From eligibility to delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
