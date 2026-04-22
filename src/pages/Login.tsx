import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/app";
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: "Não foi possível entrar",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/app";

    toast({
      title: "Login realizado",
      description: "Seu portal foi liberado com segurança.",
    });
    navigate(nextPath, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,47,60,0.18),transparent_28%),linear-gradient(180deg,#f5efe5_0%,#f8fbfa_55%,#edf2f1_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden overflow-hidden rounded-[2rem] border border-slate-200 bg-[#102432] text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] lg:block">
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.14),transparent_35%)] p-10">
              <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">Área restrita</p>
              <h1 className="mt-4 text-5xl leading-tight">
                Acesse sua área de estudos.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/72">
                Entre para continuar suas aulas, baixar materiais e acompanhar sua evolução dentro
                do portal.
              </p>

              <div className="mt-10 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                    Portal protegido
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    Seu acesso fica seguro com email e senha cadastrados.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                    <GraduationCap className="h-4 w-4" />
                    Área do aluno
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    Aulas, materiais e indicadores reunidos em uma experiência simples.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-border/60 bg-white/92 shadow-xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <LogIn className="h-5 w-5" />
              </div>
              <CardTitle className="text-3xl">Entrar no portal</CardTitle>
              <CardDescription>
                Use seu email e senha para continuar seus estudos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="pl-9"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="pl-9"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Sua senha"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
