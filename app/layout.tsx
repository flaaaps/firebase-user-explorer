import "./globals.css";

export const metadata = {
  title: "User Explorer",
  description: "Search Firebase Auth users by email substring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b1020] text-[#e6e8ee]">
        <div className="mx-auto max-w-[900px] p-8">
          <header className="mb-6">
            <h1 className="m-0 text-2xl">User Explorer</h1>
            <p className="mt-1 text-[#9aa4bf]">
              Search Firebase Auth users by email (substring match)
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
