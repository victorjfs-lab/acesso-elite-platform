import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  TimerReset,
  Users,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminReportStudentCourse } from "@/types/academy";

const REPORTS_PER_PAGE = 10;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return dateFormatter.format(parsed);
}

function statusLabel(row: AdminReportStudentCourse) {
  if (row.enrollment.status === "expired") {
    return "Expirado";
  }

  if (row.enrollment.status === "cancelled") {
    return "Cancelado";
  }

  return "Ativo";
}

function remainingLabel(row: AdminReportStudentCourse) {
  if (row.enrollment.status === "expired") {
    return "Expirado";
  }

  if (row.daysRemaining <= 0) {
    return "Expira hoje";
  }

  if (row.daysRemaining === 1) {
    return "1 dia restante";
  }

  return `${row.daysRemaining} dias restantes`;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function AdminReports() {
  const { account } = useAuth();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => academyRepository.getAdminReports(),
    enabled: account?.role === "admin",
  });

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    const rows = data?.studentCourses ?? [];

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.account.fullName,
        row.account.email,
        row.course.title,
        statusLabel(row),
        remainingLabel(row),
        row.enrollment.grantedAt,
        formatDate(row.enrollment.grantedAt),
        row.enrollment.expiresAt,
        formatDate(row.enrollment.expiresAt),
        row.lastActivityAt,
        formatDate(row.lastActivityAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [data?.studentCourses, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / REPORTS_PER_PAGE));
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE,
  );

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Montando relatórios...
      </div>
    );
  }

  const stats = [
    {
      label: "Alunos ativos",
      value: data.stats.activeStudents,
      helper: "com matrícula ativa",
      icon: Users,
      tone: "from-blue-500 to-blue-700",
    },
    {
      label: "Acessos liberados",
      value: data.stats.totalEnrollments,
      helper: "matrículas no sistema",
      icon: TimerReset,
      tone: "from-slate-700 to-slate-950",
    },
    {
      label: "Conclusão média",
      value: `${data.stats.averageCompletionPercent}%`,
      helper: "aulas concluídas",
      icon: BookOpenCheck,
      tone: "from-emerald-400 to-teal-600",
    },
    {
      label: "Baixou indicadores",
      value: `${data.stats.indicatorDownloadPercent}%`,
      helper: "alunos com download",
      icon: Download,
      tone: "from-amber-400 to-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_30%),linear-gradient(135deg,#ffffff_0%,#eef6ff_48%,#f8fafc_100%)] p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
          <BarChart3 className="h-3.5 w-3.5" />
          Inteligência da plataforma
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950">
          Relatórios
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Veja quem está acessando, quando entrou, quanto falta de prazo, avanço nas aulas e
          percentual de alunos que abriram materiais e indicadores.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div
                  className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black tracking-[-0.06em] text-slate-950">
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Performance por curso</CardTitle>
            <CardDescription>
              Média de conclusão, alunos ativos e downloads de indicadores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.courses.map((item) => (
              <div
                key={item.course.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{item.course.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.studentCount} aluno(s) · {item.lessonCount} aula(s) ·{" "}
                      {item.resourceCount} material(is)
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {item.averageProgressPercent}%
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Conclusão média</span>
                      <span>{item.averageProgressPercent}%</span>
                    </div>
                    <ProgressBar value={item.averageProgressPercent} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Indicadores baixados</span>
                      <span>{item.indicatorDownloadPercent}%</span>
                    </div>
                    <ProgressBar value={item.indicatorDownloadPercent} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Acessos dos alunos</CardTitle>
                <CardDescription>
                  Busca por aluno, e-mail, curso, status ou data de cadastro.
                </CardDescription>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                10 por página
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Buscar aluno, e-mail, curso ou data..."
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {visibleRows.map((row) => (
                <div key={`${row.account.id}-${row.course.id}`} className="px-5 py-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_170px_170px_190px] xl:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {row.account.fullName}
                      </p>
                      <p className="truncate text-sm text-slate-500">{row.account.email}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-primary">
                        {row.course.title}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs xl:grid-cols-1">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-slate-400">Inclusão</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {formatDate(row.enrollment.grantedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-slate-400">Expiração</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {formatDate(row.enrollment.expiresAt)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {row.completedLessons}/{row.lessonCount} aulas
                        </span>
                        <span>{row.progressPercent}%</span>
                      </div>
                      <ProgressBar value={row.progressPercent} />
                      <p className="mt-2 text-xs text-slate-400">
                        Última atividade: {formatDate(row.lastActivityAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          row.enrollment.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {statusLabel(row)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {remainingLabel(row)}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        {row.downloadedIndicatorCount}/{row.indicatorCount} indicadores
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {visibleRows.length === 0 ? (
              <div className="m-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Nenhum acesso encontrado com esse filtro.
              </div>
            ) : null}

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {visibleRows.length} de {filteredRows.length} acesso(s) · página{" "}
                  {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Próxima
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
