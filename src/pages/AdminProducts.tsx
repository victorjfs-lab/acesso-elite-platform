import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Layers3, PlusCircle, Trash2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ELITE_INTERNAL_SLUGS = new Set(["acesso-elite-bundle", "aula-mestre-acesso-elite"]);

export default function AdminProducts() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [eliteSettingsByCourseId, setEliteSettingsByCourseId] = useState<
    Record<string, { sortOrder: string; releaseDelayDays: string }>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => academyRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: "published" | "draft" }) =>
      academyRepository.updateCourseStatus(courseId, status),
    onSuccess: async (_course, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Status atualizado",
        description:
          variables.status === "published"
            ? "O curso foi publicado."
            : "O curso voltou para rascunho.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível atualizar o status",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => academyRepository.deleteCourse(courseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Curso removido",
        description: "O curso foi apagado da biblioteca.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível excluir o curso",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const saveEliteSettingsMutation = useMutation({
    mutationFn: ({
      courseId,
      sortOrder,
      releaseDelayDays,
    }: {
      courseId: string;
      sortOrder: number;
      releaseDelayDays: number;
    }) =>
      academyRepository.updateEliteCourseSettings({
        courseId,
        eliteSortOrder: sortOrder,
        eliteReleaseDelayDays: releaseDelayDays,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso Elite atualizado",
        description: "A ordem e o tempo de liberação do curso foram salvos.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível salvar o Acesso Elite",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setEliteSettingsByCourseId(
      Object.fromEntries(
        data.courseStructures.map((item) => [
          item.course.id,
          {
            sortOrder: String(item.course.eliteSortOrder ?? 100),
            releaseDelayDays: String(item.course.eliteReleaseDelayDays ?? 0),
          },
        ]),
      ),
    );
  }, [data]);

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Carregando produtos...
      </div>
    );
  }

  const eliteCourses = data.courseStructures.filter(
    (item) => !ELITE_INTERNAL_SLUGS.has(item.course.slug),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-primary/65">Produtos</p>
            <h1 className="mt-3 text-4xl text-slate-900">Seus cursos, do jeito certo.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Aqui fica a parte estilo Hotmart: lista de produtos, criação de curso e entrada no
              editor para montar módulos e aulas sem bagunçar o painel de operação.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/app/admin/produtos/novo">
              <PlusCircle className="h-4 w-4" />
              Criar novo curso
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <BookOpen className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Cursos cadastrados</p>
            <p className="mt-2 text-3xl font-semibold">{data.courseStructures.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <Layers3 className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Cursos publicados</p>
            <p className="mt-2 text-3xl font-semibold">{data.stats.publishedCourses}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <PlusCircle className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Próximo passo</p>
            <p className="mt-2 text-lg font-semibold">Criar módulos e aulas</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Acesso Elite</h2>
          <p className="text-muted-foreground">
            Organize a ordem dos cards e defina em quantos dias cada curso libera dentro do Elite.
          </p>
        </div>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-[minmax(0,1.8fr)_140px_180px_130px] gap-3 border-b border-border/70 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div>Curso</div>
              <div>Ordem</div>
              <div>Liberar em</div>
              <div></div>
            </div>
            {eliteCourses.map((item) => {
              const draft = eliteSettingsByCourseId[item.course.id] ?? {
                sortOrder: String(item.course.eliteSortOrder ?? 100),
                releaseDelayDays: String(item.course.eliteReleaseDelayDays ?? 0),
              };

              return (
                <div
                  key={item.course.id}
                  className="grid grid-cols-[minmax(0,1.8fr)_140px_180px_130px] gap-3 border-b border-border/60 px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.course.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {item.course.status === "published" ? "Publicado" : "Rascunho"}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setEliteSettingsByCourseId((current) => ({
                        ...current,
                        [item.course.id]: {
                          ...draft,
                          sortOrder: event.target.value,
                        },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={draft.releaseDelayDays}
                      onChange={(event) =>
                        setEliteSettingsByCourseId((current) => ({
                          ...current,
                          [item.course.id]: {
                            ...draft,
                            releaseDelayDays: event.target.value,
                          },
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">dias</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveEliteSettingsMutation.isPending}
                    onClick={() =>
                      saveEliteSettingsMutation.mutate({
                        courseId: item.course.id,
                        sortOrder: Math.max(1, Number(draft.sortOrder) || 100),
                        releaseDelayDays: Math.max(0, Number(draft.releaseDelayDays) || 0),
                      })
                    }
                  >
                    Salvar
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Biblioteca de produtos</h2>
          <p className="text-muted-foreground">
            Cada curso tem uma tela própria de edição, como um workspace separado.
          </p>
        </div>

        {data.courseStructures.length === 0 ? (
          <Card className="border-dashed border-border/70">
            <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
              Você ainda não tem cursos cadastrados. Clique em `Criar novo curso` para abrir o fluxo
              guiado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.courseStructures.map((item) => (
              <Card key={item.course.id} className="border-border/60 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{item.course.title}</CardTitle>
                      <CardDescription>{item.course.subtitle}</CardDescription>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        item.course.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.course.status === "published" ? "Publicado" : "Rascunho"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="leading-7 text-muted-foreground">{item.course.description}</p>

                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-2xl bg-secondary/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Módulos</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{item.modules.length}</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Instrutor</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {item.course.instructorName}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preço</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{item.course.priceLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="gap-2">
                      <Link to={`/app/admin/produtos/${item.course.id}`}>
                        Abrir editor do curso
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={`/app/curso/${item.course.id}`}>Visualizar curso</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          courseId: item.course.id,
                          status: item.course.status === "published" ? "draft" : "published",
                        })
                      }
                    >
                      {item.course.status === "published" ? "Mover para rascunho" : "Publicar curso"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-red-600 hover:text-red-700"
                      disabled={deleteCourseMutation.isPending}
                      onClick={() => {
                        if (!window.confirm(`Deseja mesmo excluir o curso ${item.course.title}?`)) {
                          return;
                        }

                        deleteCourseMutation.mutate(item.course.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir curso
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
