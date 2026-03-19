import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  FileStack,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const steps = [
  "Aluno envia os dados e cria a propria senha.",
  "Pedido entra no painel admin para aprovacao.",
  "Aprovação libera o curso com o prazo que você escolher: 3 meses, 6 meses ou 1 ano.",
];

export default function EnrollmentPage() {
  const { slug = "" } = useParams();
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
    queryKey: ["enrollment-link", slug],
    queryFn: () => academyRepository.getEnrollmentLinkBySlug(slug),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
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
        slug,
        fullName,
        email,
        whatsapp,
        notes,
        password,
      });
      setIsSubmitted(true);
      toast({
        title: "Cadastro enviado",
        description: "O login do aluno foi preparado e a solicitação foi enviada para aprovação.",
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Carregando página de cadastro...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-xl border-border/60">
          <CardHeader>
            <CardTitle>Link de cadastro não encontrado</CardTitle>
            <CardDescription>
              Confira o link enviado ao aluno ou crie um novo link de matrícula no painel admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">Voltar para a pagina inicial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4eee3_0%,#f7faf8_50%,#edf2f1_100%)] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Button asChild variant="ghost" className="mb-6 gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <div
              className="h-72 bg-cover bg-center"
              style={{ backgroundImage: `url(${data.course.heroImage})` }}
            />
            <div className="space-y-6 p-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">
                  {data.link.title}
                </p>
                <h1 className="text-4xl leading-tight">{data.course.title}</h1>
                <p className="max-w-2xl text-lg leading-8 text-white/75">
                  {data.course.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <CalendarRange className="mb-3 h-5 w-5 text-amber-300" />
                  <p className="text-sm text-white/65">Acesso</p>
                  <p className="mt-2 text-xl font-semibold">{data.course.accessDurationDays} dias</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Video className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-sm text-white/65">Videoaulas</p>
                  <p className="mt-2 text-xl font-semibold">Vimeo</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <FileStack className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-sm text-white/65">Materiais</p>
                  <p className="mt-2 text-xl font-semibold">PDFs e indicadores</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-white/60">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Fluxo da matrícula
                </div>
                <div className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-white/72">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Card className="border-border/60 bg-white/90 shadow-xl backdrop-blur">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl">Cadastro do aluno</CardTitle>
              <CardDescription>
                O aluno envia os dados, cria a senha dele, você aprova no painel admin e o
                sistema libera o prazo que você definir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-xl font-semibold text-emerald-900">Solicitação enviada</p>
                    <p className="mt-2 leading-7 text-emerald-800">
                      Agora basta aprovar no painel admin. Depois da liberação, o aluno entra com
                      o email e a senha que acabou de cadastrar para acessar o curso pelo prazo
                      escolhido no admin.
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

                  <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
                    Este cadastro já registra o login do aluno, mas o curso só é liberado depois da
                    aprovação no admin. A partir da liberação, você escolhe se o acesso dura 3
                    meses, 6 meses ou 1 ano.
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
