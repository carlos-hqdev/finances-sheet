import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autenticação | Finances Sheet",
  description: "Faça login ou crie sua conta no Finances Sheet",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-50" />

      <div className="w-full max-w-md relative z-10 transition-all duration-300 animate-in fade-in zoom-in slide-in-from-bottom-4">
        {children}
      </div>
    </div>
  );
}
