import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Copy, GraduationCap, Link2, TimerReset, Users } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const statIcons = [Users, CalendarClock, TimerReset, GraduationCap];
const accessOptions = [
  { label: "1 mes", value: 30 },
  { label: "3 meses", value: 90 },
  { label: "6 meses", value: 180 },
  { label: "1 ano", value: 365 },
];

export default function AdminDashboard() {
  const { account, isDemoMode } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requestDurations, setRequestDurations] = useState<Record<string, number>>({});
  const [renewDurations, setRenewDurations] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => academyRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, durationDays }: { requestId: string; durationDays: number }) =>
      academyRepository.approveEnrollmentRequest(requestId, durationDays),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso liberado",
        description: "A matricula foi aprovada com o prazo escolhido.",
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
        title: "Usuario removido",
        description: "O aluno foi removido da area administrativa.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel excluir o usuario",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#102f3c_0%,#0b1f29_100%)] p-8 text-white shadow-lg">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">Operacao</p>
            <h1 className="mt-3 text-4xl">Matriculas, acessos e renovacoes.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">
              Esta area ficou focada na operacao. A construcao do curso agora acontece separada, em
              `Produtos`, no fluxo estilo Hotmart.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/65">Pendencias agora</p>
              <p className="mt-2 text-3xl font-semibold">{data.stats.pendingRequests}</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/65">Expirando em 30 dias</p>
              <p className="mt-2 text-3xl font-semibold">{data.stats.expiringSoon}</p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                <Link to="/app/admin/produtos">Ir para Produtos</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <Link to="/app/admin/produtos/novo">Criar novo curso</Link>
              </Button>
            </div>
            {isDemoMode ? (
              <div className="sm:col-span-2 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/75">
                No modo demonstracao, novos alunos aprovados usam a senha padrao <b>acesso123</b>.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = statIcons[index];
          return (
            <Card key={item.label} className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Links de cadastro</CardTitle>
            <CardDescription>
              Cada link pode ser enviado para uma turma, campanha ou lista especifica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.links.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-border/70 bg-secondary/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{link.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {link.description}
                    </p>
                    <p className="mt-3 text-sm text-primary">/cadastro/{link.slug}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Ativo
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void copyLink(link.slug)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Solicitacoes de matricula</CardTitle>
            <CardDescription>
              Aprove aqui e escolha se o acesso sera por 1 mes, 3 meses, 6 meses ou 1 ano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitacao no momento.</p>
            ) : (
              data.requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-border/70 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <p className="font-semibold">{request.fullName}</p>
                      <p className="text-sm text-muted-foreground">{request.email}</p>
                      <p className="text-sm text-muted-foreground">{request.whatsapp}</p>
                      <p className="text-sm text-primary">
                        {request.courseTitle} · {request.linkTitle}
                      </p>
                      {request.notes ? (
                        <p className="text-sm leading-6 text-muted-foreground">{request.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
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
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      <Card className="border-border/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Alunos e validades</CardTitle>
          <CardDescription>
            Aqui voce acompanha quem esta ativo, quem expirou e quem precisa de renovacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.students.map((student) => (
            <div
              key={student.account.id}
              className="rounded-2xl border border-border/70 bg-card p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold">{student.account.fullName}</p>
                  <p className="text-sm text-muted-foreground">{student.account.email}</p>
                  <p className="text-sm text-primary">
                    {student.course?.title ?? "Sem curso liberado"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                    {student.enrollment?.status === "active"
                      ? `${student.daysRemaining} dias restantes`
                      : student.enrollment?.status === "expired"
                        ? "Expirado"
                        : "Sem acesso"}
                  </div>
                  {student.enrollment ? (
                    <>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      >
                        Renovar acesso
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    disabled={deleteUserMutation.isPending || student.account.role === "admin"}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Deseja mesmo excluir o usuario ${student.account.fullName}?`,
                        )
                      ) {
                        return;
                      }

                      deleteUserMutation.mutate(student.account.id);
                    }}
                  >
                    Excluir usuario
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


