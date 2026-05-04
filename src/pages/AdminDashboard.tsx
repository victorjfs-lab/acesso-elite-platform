import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Copy,
  FolderKanban,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Trash2,
  TrendingUp,
  UserPlus2,
  Users,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AdminStudentAccess } from "@/types/academy";

const accessOptions = [
  { label: "1 mês", value: 30 },
  { label: "3 meses", value: 90 },
  { label: "6 meses", value: 180 },
  { label: "1 ano", value: 365 },
];
const STUDENTS_PER_PAGE = 5;
const REQUESTS_PER_PAGE = 10;

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return shortDateFormatter.format(parsed);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getInclusionDate(student: AdminStudentAccess) {
  return student.enrollment?.grantedAt ?? student.account.createdAt;
}

function getExpirationDate(student: AdminStudentAccess) {
  return student.enrollment?.expiresAt ?? null;
}

function getRemainingLabel(student: AdminStudentAccess) {
  if (!student.enrollment) {
    return "Sem acesso";
  }

  if (student.enrollment.status === "expired") {
    return "Expirado";
  }

  if (student.daysRemaining === null) {
    return "Sem prazo";
  }

  if (student.daysRemaining <= 0) {
    return "Expira hoje";
  }

  if (student.daysRemaining === 1) {
    return "1 dia restante";
  }

  return `${student.daysRemaining} dias restantes`;
}

function getRemainingTone(student: AdminStudentAccess) {
  if (!student.enrollment || student.enrollment.status === "expired") {
    return "border-red-500/20 bg-red-500/[0.08] text-red-700";
  }

  if ((student.daysRemaining ?? 0) <= 15) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-800";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-800";
}

export default function AdminDashboard() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requestDurations, setRequestDurations] = useState<Record<string, number>>({});
  const [renewDurations, setRenewDurations] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [adminSearch, setAdminSearch] = useState("");
  const [manualForm, setManualForm] = useState({
    fullName: "",
    email: "",
    whatsapp: "",
    password: "",
    courseId: "",
    durationDays: 365,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => academyRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });
  const publishedCourses =
    data?.courseStructures
      .map((item) => item.course)
      .filter((course) => course.status === "published") ?? [];
  const defaultManualCourseId = publishedCourses[0]?.id ?? "";
  const normalizedAdminSearch = adminSearch.trim().toLowerCase();
  const filteredStudents =
    data?.students.filter((student) => {
      if (!normalizedAdminSearch) {
        return true;
      }

      return [
        student.account.fullName,
        student.account.email,
        student.account.createdAt,
        formatDateLabel(student.account.createdAt),
        getInclusionDate(student),
        formatDateLabel(getInclusionDate(student)),
        getExpirationDate(student),
        formatDateLabel(getExpirationDate(student)),
        student.course?.title,
        student.enrollment?.status,
        getRemainingLabel(student),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedAdminSearch);
    }) ?? [];
  const filteredRequests =
    data?.requests.filter((request) => {
      if (!normalizedAdminSearch) {
        return true;
      }

      return [
        request.fullName,
        request.email,
        request.whatsapp,
        request.courseTitle,
        request.linkTitle,
        request.notes,
        request.status,
        request.createdAt,
        formatDateLabel(request.createdAt),
        request.approvedAt,
        formatDateLabel(request.approvedAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedAdminSearch);
    }) ?? [];
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));
  const requestTotalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE),
  );

  const approveMutation = useMutation({
    mutationFn: ({ requestId, durationDays }: { requestId: string; durationDays: number }) =>
      academyRepository.approveEnrollmentRequest(requestId, durationDays),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso liberado",
        description: "A matrícula foi aprovada com o prazo escolhido.",
      });
    },
  });

  const manualCreateMutation = useMutation({
    mutationFn: () =>
      academyRepository.createManualStudent({
        fullName: manualForm.fullName,
        email: manualForm.email,
        whatsapp: manualForm.whatsapp,
        password: manualForm.password,
        courseId: manualForm.courseId,
        durationDays: manualForm.durationDays,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setManualForm((current) => ({
        ...current,
        fullName: "",
        email: "",
        whatsapp: "",
        password: "",
      }));
      toast({
        title: "Aluno cadastrado",
        description: "O acesso foi criado manualmente e já está pronto para uso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível cadastrar o aluno",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ enrollmentId, durationDays }: { enrollmentId: string; durationDays: number }) =>
      academyRepository.renewEnrollment(enrollmentId, durationDays),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso renovado",
        description: "A validade foi renovada com o prazo escolhido.",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => academyRepository.deleteAcademyUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Usuário removido",
        description: "O aluno foi removido da área administrativa.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível excluir o usuário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!manualForm.courseId && defaultManualCourseId) {
      setManualForm((current) => ({ ...current, courseId: defaultManualCourseId }));
    }
  }, [defaultManualCourseId, manualForm.courseId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (requestPage > requestTotalPages) {
      setRequestPage(requestTotalPages);
    }
  }, [requestPage, requestTotalPages]);

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Preparando painel administrativo...
      </div>
    );
  }

  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const visibleStudents = filteredStudents.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const statusPriority = (status: string) => (status === "pending" ? 0 : 1);
    const statusDifference = statusPriority(a.status) - statusPriority(b.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const requestStartIndex = (requestPage - 1) * REQUESTS_PER_PAGE;
  const visibleRequests = sortedRequests.slice(
    requestStartIndex,
    requestStartIndex + REQUESTS_PER_PAGE,
  );
  const adminFirstName = account?.fullName?.split(" ")[0] ?? "Victor";
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const stats = [
    {
      label: "Alunos ativos",
      value: data.stats.activeStudents,
      helper: "com acesso liberado",
      Icon: Users,
      tone: "from-blue-500 to-blue-700",
      trend: "+ controle",
    },
    {
      label: "Pedidos pendentes",
      value: data.stats.pendingRequests,
      helper: "aguardando aprovação",
      Icon: Bell,
      tone: "from-amber-400 to-orange-500",
      trend: "atenção",
    },
    {
      label: "Vencendo em 30 dias",
      value: data.stats.expiringSoon,
      helper: "renovar em breve",
      Icon: TimerReset,
      tone: "from-violet-500 to-slate-700",
      trend: "prazo",
    },
    {
      label: "Cursos publicados",
      value: data.stats.publishedCourses,
      helper: "disponíveis no portal",
      Icon: FolderKanban,
      tone: "from-emerald-400 to-teal-600",
      trend: "catálogo",
    },
  ];

  async function copyLink(slug: string) {
    const fullUrl =
      typeof window === "undefined"
        ? `/cadastro/${slug}`
        : `${window.location.origin}/cadastro/${slug}`;

    await navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link copiado",
      description: fullUrl,
    });
  }

  return (
    <div className="space-y-6 rounded-[2rem] bg-[#f5f8fc] p-1">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#eef6ff_54%,#e9eef6_100%)] p-7 shadow-[0_24px_70px_rgba(30,64,175,0.12)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Control Center
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
              {greeting}, {adminFirstName}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Sua operação está organizada: matrículas, alunos, links e renovações em um painel
              mais limpo, rápido e fácil de bater o olho.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl border-white bg-white/80 px-5 shadow-sm hover:bg-white"
            >
              <Link to="/app/admin/produtos">
                <FolderKanban className="mr-2 h-4 w-4" />
                Produtos
              </Link>
            </Button>
            <Button
              asChild
              className="h-12 rounded-2xl bg-blue-700 px-5 text-white shadow-[0_18px_45px_rgba(37,99,235,0.25)] hover:bg-blue-800"
            >
              <Link to="/app/admin/produtos/novo">
                <UserPlus2 className="mr-2 h-4 w-4" />
                Novo curso
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[1.4rem] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={adminSearch}
            onChange={(event) => {
              setAdminSearch(event.target.value);
              setCurrentPage(1);
              setRequestPage(1);
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Buscar por aluno, e-mail, WhatsApp, curso, status ou data..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-600">
            <Activity className="h-4 w-4 text-blue-700" />
            {filteredStudents.length} alunos
          </span>
          <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-50 px-4 text-sm font-semibold text-amber-700">
            <Bell className="h-4 w-4" />
            {filteredRequests.length} solicitações
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.Icon;
          return (
            <Card
              key={item.label}
              className="overflow-hidden border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
            >
              <CardContent className="relative p-6">
                <div
                  className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="absolute right-5 top-6 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {item.trend}
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

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <UserPlus2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Cadastro manual de aluno</CardTitle>
                <CardDescription>
                  Crie o login e libere o curso na hora, sem depender do link público.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome completo</label>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.fullName}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.email}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="aluno@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">WhatsApp</label>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.whatsapp}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, whatsapp: event.target.value }))
                  }
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Senha inicial</label>
                <input
                  type="password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.password}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Curso</label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.courseId}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, courseId: event.target.value }))
                  }
                >
                  {publishedCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prazo</label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
                  value={manualForm.durationDays}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      durationDays: Number(event.target.value),
                    }))
                  }
                >
                  {accessOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm leading-7 text-slate-600">
              O aluno já sai com login criado e acesso liberado no prazo escolhido. Se o email já
              existir, a senha é atualizada e a matrícula é renovada.
            </div>

            <Button
              onClick={() => manualCreateMutation.mutate()}
              disabled={
                manualCreateMutation.isPending ||
                !manualForm.fullName.trim() ||
                !manualForm.email.trim() ||
                !manualForm.password.trim() ||
                !manualForm.courseId
              }
              className="h-11 rounded-xl px-5"
            >
              {manualCreateMutation.isPending ? "Criando aluno..." : "Cadastrar aluno agora"}
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Solicitações de matrícula</CardTitle>
                <CardDescription>
                  Lista compacta para aprovar, revisar contato e acompanhar o histórico.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">10 por página</span>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                  {filteredRequests.length} total
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {visibleRequests.length === 0 ? (
              <div className="m-5 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                Nenhuma solicitação no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50/75 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_190px_260px] xl:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
                        {getInitials(request.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {request.fullName}
                        </p>
                        <p className="truncate text-sm text-slate-500">{request.email}</p>
                        <p className="text-xs text-slate-400">
                          {request.whatsapp || "Sem WhatsApp"}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-primary">
                        {request.courseTitle}
                      </p>
                      <p className="truncate text-xs text-slate-500">{request.linkTitle}</p>
                      {request.notes ? (
                        <p className="line-clamp-1 text-xs text-slate-400">{request.notes}</p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs xl:grid-cols-1">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="uppercase tracking-[0.18em] text-slate-400">Cadastro</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {formatDateLabel(request.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="uppercase tracking-[0.18em] text-slate-400">Aprovação</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {formatDateLabel(request.approvedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          request.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {request.status === "approved" ? "Aprovado" : "Pendente"}
                      </span>

                      {request.status === "pending" ? (
                        <>
                          <select
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-primary"
                            value={requestDurations[request.id] ?? 365}
                            onChange={(event) =>
                              setRequestDurations((current) => ({
                                ...current,
                                [request.id]: Number(event.target.value),
                              }))
                            }
                          >
                            {accessOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            onClick={() =>
                              approveMutation.mutate({
                                requestId: request.id,
                                durationDays: requestDurations[request.id] ?? 365,
                              })
                            }
                            disabled={approveMutation.isPending}
                            size="sm"
                            className="h-9 rounded-xl"
                          >
                            Liberar
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {requestTotalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {visibleRequests.length} de {filteredRequests.length} solicitação(ões) -
                  página {requestPage} de {requestTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={requestPage === 1}
                    onClick={() => setRequestPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={requestPage === requestTotalPages}
                    onClick={() => setRequestPage((page) => Math.min(requestTotalPages, page + 1))}
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card className="hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-700" />
                Links de cadastro
              </CardTitle>
              <CardDescription>
                Cada link pode ser enviado para uma turma, campanha ou lista específica.
              </CardDescription>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {data.links.length} link(s) ativos
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {data.links.map((link) => (
            <div
              key={link.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{link.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{link.description}</p>
                  <p className="mt-3 break-all text-sm text-primary">/cadastro/{link.slug}</p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Ativo
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => void copyLink(link.slug)}
                  className="gap-2 rounded-xl"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Alunos e validade</CardTitle>
              <CardDescription>
                Visual mais compacto, com inclusão, prazo restante e renovação rápida.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium">
                5 por página
              </span>
              <span>
                Mostrando {visibleStudents.length} de {filteredStudents.length} aluno(s)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleStudents.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
              Ainda não há alunos cadastrados.
            </div>
          ) : (
            visibleStudents.map((student) => (
              <div
                key={student.account.id}
                className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)] transition hover:border-blue-200 hover:bg-blue-50/20"
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.92fr)_auto]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
                      {getInitials(student.account.fullName)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {student.account.fullName}
                      </p>
                      <p className="truncate text-sm text-slate-500">{student.account.email}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          {student.course?.title ?? "Sem curso liberado"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRemainingTone(student)}`}
                        >
                          {getRemainingLabel(student)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                        Incluído em
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDateLabel(getInclusionDate(student))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                        Expira em
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDateLabel(getExpirationDate(student))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                        Status
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {student.enrollment?.status === "active"
                          ? "Ativo"
                          : student.enrollment?.status === "expired"
                            ? "Expirado"
                            : "Sem acesso"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                    {student.enrollment ? (
                      <>
                        <select
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary"
                          value={renewDurations[student.enrollment.id] ?? 365}
                          onChange={(event) =>
                            setRenewDurations((current) => ({
                              ...current,
                              [student.enrollment!.id]: Number(event.target.value),
                            }))
                          }
                        >
                          {accessOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          onClick={() =>
                            renewMutation.mutate({
                              enrollmentId: student.enrollment!.id,
                              durationDays: renewDurations[student.enrollment!.id] ?? 365,
                            })
                          }
                          disabled={renewMutation.isPending}
                          className="rounded-xl"
                        >
                          Renovar
                        </Button>
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                        Sem matrícula ativa
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deleteUserMutation.isPending || student.account.role === "admin"}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Deseja mesmo excluir o usuário ${student.account.fullName}?`,
                          )
                        ) {
                          return;
                        }

                        deleteUserMutation.mutate(student.account.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página {currentPage} de {totalPages}
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
    </div>
  );
}
