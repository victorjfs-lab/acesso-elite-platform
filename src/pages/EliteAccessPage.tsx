import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  FileStack,
  GraduationCap,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { formatPtText } from "@/lib/pt-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const ELITE_SLUG = "acesso-elite";

export default function EliteAccessPage() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["elite-public-catalog"],
    queryFn: () => academyRepository.getPublicCatalog(),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.trim().length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use pelo menos 6 caracteres para a senha do aluno.",
        variant: "destructive",
      });
      return;
    }

    if (password !== passwordConfirm) {
      toast({
        title: "As senhas não conferem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await academyRepository.submitEnrollmentRequest({
        slug: ELITE_SLUG,
        fullName,
        email,
        whatsapp,
        notes,
        password,
      });
      setIsSubmitted(true);
      toast({
        title: "Cadastro elite enviado",
        description: "O pedido entrou para aprovação com acesso a todos os cursos publicados.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível enviar",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#07131a_0%,#0c161f_100%)]">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70 shadow-sm">
          Preparando o acesso elite...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(252,211,77,0.15),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,#07131a_0%,#0a1218_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Button asChild variant="ghost" className="mb-6 gap-2 text-white hover:bg-white/10 hover:text-white">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
              <div
                className="relative h-72 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg,rgba(2,6,23,0.88),rgba(2,6,23,0.42)), url(https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80)",
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200">
                    <Crown className="h-4 w-4" />
                    ACESSO ELITE
                  </div>
                  <h1 className="mt-5 max-w-4xl text-5xl leading-[1.02] text-white sm:text-6xl">
                    Acesso Elite
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
                    Você tem acesso a todas as estratégias, aulas, indicadores e à mentoria de
                    Victor Garcia.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-3">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <GraduationCap className="mb-2 h-4.5 w-4.5 text-amber-200" />
                  <p className="text-xs text-white/65">Acesso</p>
                  <p className="mt-2 text-[2rem] font-semibold leading-none">365 dias</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <Video className="mb-2 h-4.5 w-4.5 text-sky-300" />
                  <p className="text-xs text-white/65">Aulas</p>
                  <p className="mt-2 text-[1.7rem] font-semibold leading-tight">+100 aulas</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <FileStack className="mb-2 h-4.5 w-4.5 text-emerald-300" />
                  <p className="text-xs text-white/65">Materiais</p>
                  <p className="mt-2 text-[1.45rem] font-semibold leading-tight">
                    Indicadores, Planilhas, PDF
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-white/55">
                <GraduationCap className="h-4 w-4 text-amber-200" />
                Biblioteca publicada
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {data.courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden border-white/10 bg-[#0c1820] text-white">
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${course.heroImage})` }}
                    />
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">
                          {formatPtText(course.subtitle)}
                        </p>
                        <div className="mt-3 inline-flex max-w-full rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <h2 className="text-[1.55rem] font-semibold leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_10px_rgba(255,255,255,0.06)]">
                            {formatPtText(course.title)}
                          </h2>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/70">
                          {formatPtText(course.description)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                          {formatPtText(course.durationLabel)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                          {formatPtText(course.supportLabel)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

          </div>

          <Card className="h-fit border-white/10 bg-white/95 text-slate-900 shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl">Cadastro do aluno</CardTitle>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-xl font-semibold text-emerald-900">Pedido enviado</p>
                    <p className="mt-2 leading-7 text-emerald-800">
                      Seu cadastro foi enviado com sucesso. Assim que o acesso for aprovado, você
                      recebe o pacote completo.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/login">Ir para o login</Link>
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Seu nome"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha de acesso</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Minimo de 6 caracteres"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                      <Input
                        id="passwordConfirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                        placeholder="Repita a senha"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Conte algo importante sobre sua matrícula"
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar cadastro"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
