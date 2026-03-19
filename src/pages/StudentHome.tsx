import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileText,
  GraduationCap,
  Hourglass,
  PlayCircle,
  TimerReset,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { formatPtText } from "@/lib/pt-display";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const defaultFinanceHero =
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#f3c552_0%,#93f0cf_100%)]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : tone === "warning"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
        : "border-white/10 bg-white/5 text-white";

  return (
    <div className={`rounded-[1.35rem] border px-4 py-3 ${toneClass}`}>
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function StudentHome() {
  const { account, session } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-dashboard", account?.id, session?.user.email],
    queryFn: () =>
      academyRepository.getStudentDashboard({
        accountId: account?.id,
        email: session?.user.email,
      }),
    enabled: Boolean(account?.id || session?.user.email),
  });

  if (account?.role === "admin") {
    return <Navigate to="/app/admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-5 text-sm text-white/60 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        Preparando sua área de estudos...
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/10 text-amber-50">
        <CardContent className="p-6 text-sm leading-7">
          Não foi possível carregar sua área do aluno.
          <br />
          {error instanceof Error ? error.message : "Tente sair e entrar novamente."}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-white/10 bg-white/[0.03] text-white">
        <CardContent className="p-6 text-sm leading-7 text-white/65">
          Seu perfil ainda não foi sincronizado com a área do aluno. Saia e entre novamente. Se
          continuar assim, aprove ou recrie a matrícula no painel admin.
        </CardContent>
      </Card>
    );
  }

  const featuredAccess = data.activeAccess[0] ?? null;
  const featuredHero = featuredAccess?.course.heroImage?.trim() || defaultFinanceHero;

  return (
    <div className="space-y-8 text-white">
      {featuredAccess ? (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111417] shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <div className="grid xl:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden p-8 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,197,82,0.16),transparent_26%),linear-gradient(145deg,rgba(18,20,23,0.98)_0%,rgba(18,20,23,0.84)_55%,rgba(18,20,23,0.72)_100%)]" />
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url(${featuredHero})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
              />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-200/90">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Área do aluno
                </div>

                <h1 className="mt-8 max-w-3xl text-4xl leading-[1.08] text-white sm:text-5xl">
                  {formatPtText(featuredAccess.course.title)}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
                  {formatPtText(featuredAccess.course.description)}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <StatPill label="Aulas" value={featuredAccess.lessons.length} />
                  <StatPill label="Materiais" value={featuredAccess.resources.length} />
                  <StatPill
                    label="Prazo restante"
                    value={`${featuredAccess.daysRemaining} dias`}
                    tone="success"
                  />
                </div>

                <div className="mt-8 max-w-md rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white/65">Progresso estimado</p>
                    <p className="text-sm font-semibold text-white">
                      {featuredAccess.progressPercent}%
                    </p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={featuredAccess.progressPercent} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/55">
                    Próxima aula:{" "}
                    <span className="text-white/82">
                      {formatPtText(
                        featuredAccess.nextLesson?.title ?? "Conteúdo pronto para assistir",
                      )}
                    </span>
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="h-12 rounded-xl bg-white px-6 text-base font-semibold text-slate-950 hover:bg-white/90"
                  >
                    <Link to={`/app/curso/${featuredAccess.course.id}`}>
                      Assistir agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white"
                  >
                    <a href="#todos-os-cursos">Ver biblioteca</a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden border-t border-white/10 bg-[#0e1114] xl:border-l xl:border-t-0">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(8,10,12,0.24), rgba(8,10,12,0.84)), url(${featuredHero})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
                <div className="self-start rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/75">
                  Curso premium
                </div>
                <div className="max-w-md">
                  <p className="text-sm uppercase tracking-[0.3em] text-amber-200/80">
                    {formatPtText(featuredAccess.course.supportLabel)}
                  </p>
                  <h2 className="mt-3 text-3xl leading-tight text-white">
                    {formatPtText(featuredAccess.course.subtitle)}
                  </h2>
                  <p className="mt-4 leading-7 text-white/68">
                    Trilha pronta para consumo contínuo com aulas, materiais e acesso controlado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.32em] text-white/40">Area do aluno</p>
          <h1 className="mt-4 text-4xl text-white">Seu acesso ainda está sendo preparado.</h1>
          <p className="mt-4 max-w-2xl leading-8 text-white/60">
            Assim que o admin liberar sua matrícula, os cursos vão aparecer aqui com capa, trilha e
            player completo.
          </p>
        </section>
      )}

      <section id="todos-os-cursos" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/40">Biblioteca</p>
            <h2 className="mt-2 text-3xl text-white">Todos os seus cursos</h2>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/60">
            <span>{data.activeAccess.length} ativos</span>
            <span>{data.pendingRequests.length} aguardando</span>
            <span>{data.expiredAccess.length} expirados</span>
          </div>
        </div>

        {data.activeAccess.length === 0 ? (
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardContent className="p-6 text-sm leading-7 text-white/60">
              Ainda não há cursos ativos neste login. Se você acabou de enviar o cadastro, aguarde a
              liberação no painel administrativo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {data.activeAccess.map((access) => (
              <article
                key={access.course.id}
                className="group overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,#12161b_0%,#0f1317_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.38)] transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_30px_90px_rgba(0,0,0,0.46)]"
              >
                <div className="grid h-full gap-0">
                  <div className="relative min-h-[210px] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(8,10,12,0.08) 0%, rgba(8,10,12,0.18) 32%, rgba(8,10,12,0.78) 100%), url(${access.course.heroImage?.trim() || defaultFinanceHero})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_28%,rgba(10,11,13,0.9)_100%)]" />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                      <div className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[0.62rem] uppercase tracking-[0.22em] text-white/72 backdrop-blur">
                        {formatPtText(access.course.supportLabel)}
                      </div>
                      <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                        Ativo
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-amber-200/80">
                        {formatPtText(access.course.subtitle)}
                      </p>
                      <div className="mt-3 inline-flex max-w-full rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                        <h3 className="text-[1.25rem] font-semibold leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_10px_rgba(255,255,255,0.08)] sm:text-[1.42rem]">
                          {formatPtText(access.course.title)}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-full flex-col p-5">
                    <div>
                      <p className="line-clamp-4 text-sm leading-7 text-white/64">
                        {formatPtText(access.course.description)}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/36">
                          Progresso
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {access.progressPercent}%
                        </p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/36">
                          Prazo
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {access.daysRemaining} dias
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-white/60">Continue de onde parou</p>
                        <p className="text-sm font-semibold text-white">{access.progressPercent}%</p>
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={access.progressPercent} />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-white/58">
                        Próxima aula:{" "}
                        <span className="text-white/82">
                          {formatPtText(
                            access.nextLesson?.title ?? "Curso liberado e pronto para assistir",
                          )}
                        </span>
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3 pt-5">
                      <Button
                        asChild
                        className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-white/90"
                      >
                        <Link to={`/app/curso/${access.course.id}`}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Entrar no curso
                        </Link>
                      </Button>
                      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/58">
                        <Clock3 className="h-4 w-4 text-amber-200" />
                        Acesso de {access.course.accessDurationDays} dias
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {data.pendingRequests.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/40">Aguardando</p>
            <h2 className="mt-2 text-2xl text-white">Cadastros em analise</h2>
          </div>
          <div className="grid gap-4">
            {data.pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-amber-300/15 bg-amber-300/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-white">{request.fullName}</p>
                  <p className="mt-1 text-sm text-white/55">{request.email}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100">
                  <Hourglass className="h-4 w-4" />
                  Aguardando aprovação
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.expiredAccess.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/40">Historico</p>
            <h2 className="mt-2 text-2xl text-white">Cursos expirados</h2>
          </div>
          <div className="grid gap-4">
            {data.expiredAccess.map((access) => (
              <div
                key={access.course.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/38">
                    <TimerReset className="h-3.5 w-3.5" />
                    Vencido
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {formatPtText(access.course.title)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    O prazo terminou. Se quiser, você pode liberar novamente no admin por mais 12
                    meses.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                  <BadgeCheck className="h-4 w-4" />
                  Curso encerrado
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
