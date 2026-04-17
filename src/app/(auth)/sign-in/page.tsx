import Link from "next/link";
import { SignInForm } from "@/features/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default function SignInPage() {
  return (
    <Card className="border-border bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
      <CardHeader className="space-y-1 text-center pb-8 pt-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
            <span className="text-2xl font-bold text-primary tracking-tighter italic">
              FS
            </span>
          </div>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Bem-vindo de volta
        </CardTitle>
        <CardDescription className="text-muted-foreground text-balance">
          Entre com seu e-mail e senha para acessar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-10">
        <SignInForm />

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <Link
            href="/sign-up"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Crie agora
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
