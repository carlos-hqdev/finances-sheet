import { SignUpForm } from "@/features/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <Card className="border-border bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
      <CardHeader className="space-y-1 text-center pb-8 pt-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
            <span className="text-2xl font-bold text-primary tracking-tighter italic">FS</span>
          </div>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Criar sua conta
        </CardTitle>
        <CardDescription className="text-muted-foreground text-balance">
          Preencha os dados abaixo para começar a gerenciar suas finanças de forma premium
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-10">
        <SignUpForm />
        
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Já tem uma conta? </span>
          <Link href="/sign-in" className="text-primary hover:underline font-medium transition-colors">
            Fazer login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
