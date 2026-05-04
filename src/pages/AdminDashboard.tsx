import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  ShieldCheck,
  TimerReset,
  Trash2,
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

const statIcons = [Users, CalendarClock, TimerReset, GraduationCap];
const accessOptions = [
  { label: "1 mês", value: 30 },
  { label: "3 meses", value: 90 },
  { label: "6 meses", value: 180 },
  { label: "1 ano", value: 365 },
];
const STUDENTS_PER_PAGE = 25;

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
  const { account, isDemoMode } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requestDurations, setRequestDurations] = useState<Record<string, number>>({});
  const [renewDurations, setRenewDurations] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil((data?.students.length ?? 0) / STUDENTS_PER_PAGE));

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
  const visibleStudents = data.students.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  const stats = [
    { label: "Alunos ativos", value: data.stats.activeStudents },
    { label: "Pedidos pendentes", value: data.stats.pendingRequests },
    { label: "Vencendo em 30 dias", value: data.stats.expiringSoon },
    { label: "Cursos publicados", value: data.stats.publishedCourses },
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
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(241,180,49,0.12),transparent_20%),linear-gradient(135deg,#0f2230_0%,#0a141b_54%,#111111_100%)] p-8 text-white shadow-[0_40px_120px_rgba(3,9,13,0.28)]">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">Operação</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
              Gestão de matrículas com leitura rápida e controle fino.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">
              Agora a parte operacional fica mais objetiva: aprovar, cadastrar manualmente,
              acompanhar inclusão, validade e renovar sem poluição visual.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-white/90">
                <Link to="/app/admin/produtos">Ir para Produtos</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/app/admin/produtos/novo">Criar novo curso</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <p className="text-sm text-white/58">Pendências imediatas</p>
              <p className="mt-2 text-3xl font-semibold">{data.stats.pendingRequests}</p>
            </div>
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <p className="text-sm text-white/58">Renovar em breve</p>
              <p className="mt-2 text-3xl font-semibold">{data.stats.expiringSoon}</p>
            </div>
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.06] p-5 text-sm leading-7 text-white/72 sm:col-span-2">
              {isDemoMode
                ? "Modo demonstração ativo: novos alunos manuais usam a senha informada e funcionam sem depender do Auth real."
                : "Modo produção ativo: os cadastros manuais já criam o login do aluno e liberam o acesso imediatamente."}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = statIcons[index];
          return (
            <Card
              key={item.label}
              className="border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
            >
              <CardContent className="p-5">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
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

        <Card className="border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle>Solicitações de matrícula</CardTitle>
            <CardDescription>
              Aprove aqui e escolha se o acesso será por 1 mês, 3 meses, 6 meses ou 1 ano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.requests.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                Nenhuma solicitação no momento.
              </div>
            ) : (
              data.requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.55rem] border border-slate-200 bg-slate-50/65 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-900">{request.fullName}</p>
                      <p className="text-sm text-slate-500">{request.email}</p>
                      <p className="text-sm text-slate-500">{request.whatsapp}</p>
                      <p className="text-sm font-medium text-primary">
                        {request.courseTitle} · {request.linkTitle}
                      </p>
                      {request.notes ? (
                        <p className="pt-1 text-sm leading-6 text-slate-500">{request.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                          request.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {request.status === "approved" ? "Aprovado" : "Pendente"}
                      </div>

                      {request.status === "pending" ? (
                        <>
                          <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary"
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
                            className="rounded-xl"
                          >
                            Liberar acesso
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Links de cadastro</CardTitle>
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

      <Card className="border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
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
                25 por página
              </span>
              <span>
                Mostrando {visibleStudents.length} de {data.students.length} aluno(s)
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
                className="rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.035)]"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.92fr)_auto]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                      {getInitials(student.account.fullName)}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-base font-semibold text-slate-900">
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

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/85 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                        Incluído em
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDateLabel(getInclusionDate(student))}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/85 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                        Expira em
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDateLabel(getExpirationDate(student))}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/85 px-4 py-3">
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
