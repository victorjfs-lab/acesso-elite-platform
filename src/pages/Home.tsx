import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Crown,
  GraduationCap,
  LockKeyhole,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { formatPtText } from "@/lib/pt-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  "Landing pública para apresentar seus cursos e capturar matrículas.",
  "Link individual de cadastro por turma ou por oferta.",
  "Liberação manual do aluno com prazo de 3 meses, 6 meses ou 1 ano.",
  "Área do aluno com videoaulas Vimeo, indicadores e PDFs.",
];

const flow = [
  {
    title: "1. Envie o link de cadastro",
    text: "Cada turma pode ter um link próprio. O aluno preenche os dados e a solicitação cai no painel admin.",
  },
  {
    title: "2. Aprove e escolha o prazo",
    text: "No painel admin você aprova a matrícula e define se o acesso será por 3 meses, 6 meses ou 1 ano.",
  },
  {
    title: "3. O aluno acessa a área protegida",
    text: "Depois do login, ele encontra aulas em vídeo, materiais em PDF e biblioteca de indicadores.",
  },
];

const pillars = [
  {
    label: "Captação",
    title: "Links organizados por turma",
    text: "Cada oferta pode ter sua própria URL pública, pronta para campanha, lista ou tráfego pago.",
  },
  {
    label: "Liberação",
    title: "Aprovação manual com prazo flexível",
    text: "Você decide quem entra e escolhe se o acesso dura 3 meses, 6 meses ou 1 ano.",
  },
  {
    label: "Consumo",
    title: "Player e biblioteca no mesmo lugar",
    text: "Aulas Vimeo, PDFs, indicadores e bonus ficam agrupados por curso e modulo.",
  },
];

export default function Home() {
  const { data } = useQuery({
    queryKey: ["public-catalog"],
    queryFn: () => academyRepository.getPublicCatalog(),
  });

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f6f0e7_0%,#f8fbfa_38%,#eef3f2_100%)] text-foreground">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-full border border-border/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/70">
              Plataforma de cursos
            </p>
            <p className="text-sm text-muted-foreground">
              Videoaulas no Vimeo, PDFs, indicadores e acessos com prazo flexível.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro/turma-radar-2026">Ver cadastro</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/acesso-elite">Acesso Elite</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="absolute left-0 top-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute right-8 top-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <GraduationCap className="h-4 w-4" />
            Estrutura pronta para vender e hospedar seus cursos
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl leading-[1.02] text-slate-900 sm:text-6xl">
              Sua área de membros com cadastro por turma, liberação manual e acesso flexível.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              O portal foi pensado para um negócio de cursos de verdade: página pública, links de
              inscrição, aprovação, player Vimeo, PDFs, indicadores e expiração automática sem
              gambiarra.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <Card key={item} className="border-border/60 bg-white/85 shadow-sm">
                <CardContent className="flex gap-3 p-5 text-sm leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/cadastro/turma-radar-2026">
                Abrir exemplo de cadastro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/acesso-elite">
                <Crown className="h-4 w-4" />
                Abrir Acesso Elite
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Entrar no portal</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/60 bg-white/70 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Acesso</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">3, 6 ou 12</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-white/70 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Conteudo</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">Vimeo + PDF</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-white/70 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Gestao</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">Admin único</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2.2rem] bg-[#102c37]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.18),transparent_38%)]" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/55">Portal</p>
                  <p className="mt-1 text-lg font-semibold">Academy Control Center</p>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Online
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-white/10 bg-white/5 text-white">
                <CardContent className="p-5">
                    <CalendarClock className="mb-3 h-5 w-5 text-emerald-300" />
                    <p className="text-sm text-white/70">Prazo configuravel</p>
                    <p className="mt-2 text-2xl font-semibold">3, 6 ou 12 meses</p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="p-5">
                    <LockKeyhole className="mb-3 h-5 w-5 text-amber-300" />
                    <p className="text-sm text-white/70">Acesso protegido</p>
                    <p className="mt-2 text-2xl font-semibold">Login + área restrita</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-white/10 bg-white/5 text-white">
                <CardContent className="p-6">
                  <p className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-white/60">
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    Como funciona
                  </p>
                  <div className="mt-5 space-y-4">
                    {flow.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/70">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/70">
              Estrutura de operação
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              O portal foi organizado para vender, liberar e entregar.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Tudo gira em torno de um fluxo simples: captar o aluno, aprovar o acesso e manter a
            área protegida limpa e controlada.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {pillars.map((item) => (
            <Card key={item.title} className="border-border/60 bg-white/80 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-[0.26em] text-primary/65">{item.label}</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-700">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(120deg,#0b1118_0%,#121923_55%,#0f1721_100%)] p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-200">
                <Crown className="h-4 w-4" />
                Acesso Elite
              </p>
              <h2 className="mt-5 text-4xl leading-tight text-white">
                Um único cadastro para liberar toda a sua biblioteca.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/72">
                Quando voce quiser vender o pacote completo, basta usar a pagina `Acesso Elite`.
                O pedido cai no admin e a liberação vale para todos os cursos publicados.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm uppercase tracking-[0.22em] text-white/55">Prazos</span>
                <span className="text-lg font-semibold">3 meses · 6 meses · 1 ano</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm uppercase tracking-[0.22em] text-white/55">Escopo</span>
                <span className="text-lg font-semibold">Todos os cursos publicados</span>
              </div>
              <Button asChild className="mt-2 bg-white text-slate-900 hover:bg-white/90">
                <Link to="/acesso-elite">Abrir pagina Acesso Elite</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/70">
              Catálogo exemplo
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Seus cursos podem aparecer assim
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Cada curso pode ter seu próprio link de cadastro, cronograma e biblioteca de apoio.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {data?.courses.map((course) => {
            const enrollmentLink = data.links.find((link) => link.courseId === course.id);
            return (
              <Card
                key={course.id}
                className="group overflow-hidden border-border/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="h-56 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${course.heroImage})` }}
                />
                <CardContent className="space-y-5 p-6">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary/70">
                      {formatPtText(course.subtitle)}
                    </p>
                    <div className="inline-flex max-w-full rounded-[1.15rem] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,240,225,0.96))] px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <h3 className="text-[1.55rem] font-semibold leading-tight tracking-[-0.03em] text-slate-900 [text-shadow:0_2px_8px_rgba(255,255,255,0.55)]">
                        {formatPtText(course.title)}
                      </h3>
                    </div>
                    <p className="leading-7 text-slate-700">{formatPtText(course.description)}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                    <span className="rounded-full bg-secondary px-3 py-1">
                      {formatPtText(course.durationLabel)}
                    </span>
                    <span className="rounded-full bg-secondary px-3 py-1">
                      {formatPtText(course.supportLabel)}
                    </span>
                    <span className="rounded-full bg-secondary px-3 py-1">{course.priceLabel}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {enrollmentLink ? (
                      <Button asChild>
                        <Link to={`/cadastro/${enrollmentLink.slug}`}>Abrir cadastro</Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="ghost" className="gap-2">
                      <Link to="/login">
                        <PlayCircle className="h-4 w-4" />
                        Ver área do aluno
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
