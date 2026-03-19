import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Copy,
  FileText,
  FolderPlus,
  Link2,
  PlayCircle,
  Save,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { CourseResourceKind } from "@/types/academy";

export default function AdminCourseEditor() {
  const { account } = useAuth();
  const { courseId = "" } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["course-editor", courseId],
    queryFn: () => academyRepository.getCourseDetail(courseId),
    enabled: Boolean(courseId && account?.role === "admin"),
  });

  const [courseTitle, setCourseTitle] = useState("");
  const [courseSubtitle, setCourseSubtitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseHeroImage, setCourseHeroImage] = useState("");
  const [courseInstructor, setCourseInstructor] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseEliteSortOrder, setCourseEliteSortOrder] = useState("100");
  const [courseEliteReleaseDelayDays, setCourseEliteReleaseDelayDays] = useState("0");
  const [courseStatus, setCourseStatus] = useState<"published" | "draft">("draft");

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [lessonModuleId, setLessonModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonDuration, setLessonDuration] = useState("10 min");
  const [lessonVimeoUrl, setLessonVimeoUrl] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceKind, setResourceKind] = useState<CourseResourceKind>("pdf");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceModuleId, setResourceModuleId] = useState("");
  const [resourceLessonId, setResourceLessonId] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkSlug, setLinkSlug] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }

    setCourseTitle(data.course.title);
    setCourseSubtitle(data.course.subtitle);
    setCourseDescription(data.course.description);
    setCourseHeroImage(data.course.heroImage);
    setCourseInstructor(data.course.instructorName);
    setCoursePrice(data.course.priceLabel);
    setCourseEliteSortOrder(String(data.course.eliteSortOrder ?? 100));
    setCourseEliteReleaseDelayDays(String(data.course.eliteReleaseDelayDays ?? 0));
    setCourseStatus(data.course.status);

    if (!selectedModuleId && data.modules.length > 0) {
      setSelectedModuleId(data.modules[0].id);
    }

    if (!lessonModuleId && data.modules.length > 0) {
      setLessonModuleId(data.modules[0].id);
    }

    if (!resourceModuleId && data.modules.length > 0) {
      setResourceModuleId(data.modules[0].id);
    }
  }, [data, lessonModuleId, selectedModuleId]);

  const refreshEditor = async () => {
    await queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const saveCourseMutation = useMutation({
    mutationFn: () =>
      academyRepository.updateCourseBasics({
        courseId,
        title: courseTitle,
        subtitle: courseSubtitle,
        description: courseDescription,
        heroImage: courseHeroImage,
        instructorName: courseInstructor,
        priceLabel: coursePrice,
        eliteSortOrder: Number(courseEliteSortOrder) || 100,
        eliteReleaseDelayDays: Math.max(0, Number(courseEliteReleaseDelayDays) || 0),
        status: courseStatus,
      }),
    onSuccess: async () => {
      await refreshEditor();
      toast({
        title: "Curso atualizado",
        description: "As informacoes principais do curso foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel salvar o curso",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: () =>
      academyRepository.createCourseModule({
        courseId,
        title: moduleTitle,
        description: moduleDescription,
      }),
    onSuccess: async (moduleItem) => {
      await refreshEditor();
      setModuleTitle("");
      setModuleDescription("");
      setSelectedModuleId(moduleItem.id);
      setLessonModuleId(moduleItem.id);
      toast({
        title: "Modulo criado",
        description: "O novo modulo ja entrou na estrutura do curso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel criar o modulo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: () =>
      academyRepository.createCourseLesson({
        moduleId: lessonModuleId,
        title: lessonTitle,
        summary: lessonSummary,
        durationLabel: lessonDuration,
        vimeoUrl: lessonVimeoUrl,
      }),
    onSuccess: async () => {
      await refreshEditor();
      setLessonTitle("");
      setLessonSummary("");
      setLessonDuration("10 min");
      setLessonVimeoUrl("");
      toast({
        title: "Aula criada",
        description: "A aula de video foi adicionada ao modulo selecionado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel criar a aula",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: () =>
      academyRepository.createCourseResource({
        courseId,
        moduleId: resourceModuleId || null,
        lessonId: resourceLessonId || null,
        title: resourceTitle,
        description: resourceDescription,
        kind: resourceKind,
        fileUrl: resourceUrl,
      }),
    onSuccess: async () => {
      await refreshEditor();
      setResourceTitle("");
      setResourceDescription("");
      setResourceKind("pdf");
      setResourceUrl("");
      setResourceLessonId("");
      toast({
        title: "Material criado",
        description: "O material ja ficou disponivel dentro do curso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel criar o material",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) => academyRepository.deleteCourseResource(resourceId),
    onSuccess: async () => {
      await refreshEditor();
      toast({
        title: "Material removido",
        description: "O material foi apagado do curso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel apagar o material",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => academyRepository.deleteCourseLesson(lessonId),
    onSuccess: async () => {
      await refreshEditor();
      toast({
        title: "Aula removida",
        description: "A aula foi apagada do modulo e a ordem foi ajustada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel apagar a aula",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: (payload: { moduleId: string; lessonIds: string[] }) =>
      academyRepository.reorderCourseLessons(payload),
    onSuccess: async () => {
      await refreshEditor();
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel reordenar as aulas",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: () =>
      academyRepository.createEnrollmentLink({
        courseId,
        title: linkTitle,
        description: linkDescription,
        slug: linkSlug,
      }),
    onSuccess: async (linkItem) => {
      await refreshEditor();
      setLinkTitle("");
      setLinkDescription("");
      setLinkSlug("");
      toast({
        title: "Link de cadastro criado",
        description: `/cadastro/${linkItem.slug}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel criar o link",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => academyRepository.deleteEnrollmentLink(linkId),
    onSuccess: async () => {
      await refreshEditor();
      toast({
        title: "Link removido",
        description: "O link de cadastro foi apagado do curso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel apagar o link",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const selectedModule = useMemo(
    () => data?.modules.find((moduleItem) => moduleItem.id === selectedModuleId) ?? null,
    [data, selectedModuleId],
  );

  const orderedModules = useMemo(
    () => data?.modules.slice().sort((a, b) => a.moduleOrder - b.moduleOrder) ?? [],
    [data],
  );

  const selectedModuleLessons = useMemo(
    () =>
      data?.lessons
        .filter((lesson) => lesson.moduleId === selectedModuleId)
        .sort((a, b) => a.lessonOrder - b.lessonOrder) ?? [],
    [data, selectedModuleId],
  );

  const resourceModuleLessons = useMemo(
    () =>
      data?.lessons
        .filter((lesson) => lesson.moduleId === resourceModuleId)
        .sort((a, b) => a.lessonOrder - b.lessonOrder) ?? [],
    [data, resourceModuleId],
  );

  const selectedModuleResources = useMemo(
    () =>
      data?.resources.filter(
        (resource) =>
          resource.moduleId === selectedModuleId ||
          selectedModuleLessons.some((lesson) => lesson.id === resource.lessonId),
      ) ?? [],
    [data, selectedModuleId, selectedModuleLessons],
  );

  function handleMoveLesson(lessonId: string, direction: "up" | "down") {
    if (!selectedModule) {
      return;
    }

    const orderedIds = selectedModuleLessons.map((lesson) => lesson.id);
    const currentIndex = orderedIds.indexOf(lessonId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const nextIds = [...orderedIds];
    const [moved] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, moved);

    reorderLessonsMutation.mutate({
      moduleId: selectedModule.id,
      lessonIds: nextIds,
    });
  }

  async function copyRegistrationLink(slug: string) {
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

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Carregando editor do curso...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" className="gap-2">
        <Link to="/app/admin/produtos">
          <ArrowLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>
      </Button>

      <section className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Editor do curso
            </div>
            <h1 className="mt-4 text-4xl text-slate-900">{data.course.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Aqui voce organiza a estrutura do produto como um workspace proprio: modulos na
              lateral, aulas de video e configuracoes na area principal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Modulos</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{orderedModules.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Aulas</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{data.lessons.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Materiais</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{data.resources.length}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link to={`/app/curso/${data.course.id}`}>Visualizar curso</Link>
            </Button>
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                data.course.status === "published"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {data.course.status === "published" ? "Publicado" : "Rascunho"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.4fr_0.6fr]">
        <Card className="overflow-hidden border-slate-900/10 bg-[#13171c] text-white shadow-[0_25px_60px_rgba(15,23,42,0.18)]">
          <CardHeader>
            <CardTitle className="text-white">Estrutura do curso</CardTitle>
            <CardDescription className="text-white/58">
              Clique em um modulo para ver as aulas dele no editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedModules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                Ainda nao existem modulos neste curso.
              </div>
            ) : (
              orderedModules.map((moduleItem) => {
                  const lessons = data.lessons
                    .filter((lesson) => lesson.moduleId === moduleItem.id)
                    .sort((a, b) => a.lessonOrder - b.lessonOrder);

                  return (
                    <button
                      key={moduleItem.id}
                      type="button"
                      onClick={() => setSelectedModuleId(moduleItem.id)}
                      className={`w-full rounded-[1.4rem] border p-5 text-left transition ${
                        selectedModuleId === moduleItem.id
                          ? "border-amber-300/40 bg-[linear-gradient(135deg,rgba(217,178,59,0.16),rgba(255,255,255,0.04))]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-sm font-semibold text-white">
                            {moduleItem.moduleOrder}
                          </div>
                          <div>
                            <p className="font-medium leading-6 text-white">{moduleItem.title}</p>
                            <p className="mt-2 text-sm leading-6 text-white/58">
                              {moduleItem.description}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/62">
                          {lessons.length} aulas
                        </span>
                      </div>
                    </button>
                  );
                })
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-border/60 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Save className="h-4 w-4" />
                <CardTitle>Informacoes do curso</CardTitle>
              </div>
              <CardDescription>Edite o basico do produto sem sair do editor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Nome do curso</Label>
                <Input
                  id="course-title"
                  value={courseTitle}
                  onChange={(event) => setCourseTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-subtitle">Subtitulo</Label>
                <Input
                  id="course-subtitle"
                  value={courseSubtitle}
                  onChange={(event) => setCourseSubtitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Descricao</Label>
                <Textarea
                  id="course-description"
                  rows={5}
                  value={courseDescription}
                  onChange={(event) => setCourseDescription(event.target.value)}
                />
              </div>
              <div className="rounded-3xl border border-amber-200/60 bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] p-5">
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                  <div className="space-y-2">
                    <Label htmlFor="course-hero-image">Imagem da capa do curso</Label>
                    <Input
                      id="course-hero-image"
                      value={courseHeroImage}
                      onChange={(event) => setCourseHeroImage(event.target.value)}
                      placeholder="https://sua-imagem.com/capa-do-curso.jpg"
                    />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Esta imagem aparece na biblioteca do aluno, no topo do player e nas vitrines do Acesso Elite.
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-slate-100">
                    {courseHeroImage.trim() ? (
                      <div
                        className="h-40 bg-cover bg-center"
                        style={{ backgroundImage: `url(${courseHeroImage})` }}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        Cole a URL da imagem para ver a capa aqui.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="course-instructor">Instrutor</Label>
                  <Input
                    id="course-instructor"
                    value={courseInstructor}
                    onChange={(event) => setCourseInstructor(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-price">Preco</Label>
                  <Input
                    id="course-price"
                    value={coursePrice}
                    onChange={(event) => setCoursePrice(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-status">Status</Label>
                  <select
                    id="course-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={courseStatus}
                    onChange={(event) =>
                      setCourseStatus(event.target.value as "published" | "draft")
                    }
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course-elite-order">Ordem no Acesso Elite</Label>
                  <Input
                    id="course-elite-order"
                    type="number"
                    min="1"
                    value={courseEliteSortOrder}
                    onChange={(event) => setCourseEliteSortOrder(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-elite-delay">Liberar no Elite após quantos dias</Label>
                  <Input
                    id="course-elite-delay"
                    type="number"
                    min="0"
                    value={courseEliteReleaseDelayDays}
                    onChange={(event) => setCourseEliteReleaseDelayDays(event.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                No Acesso Elite, cursos com ordem menor aparecem primeiro. O campo de liberação
                define quantos dias após a aprovação no Elite esse curso fica disponível.
              </div>
              <Button
                disabled={saveCourseMutation.isPending}
                onClick={() => saveCourseMutation.mutate()}
              >
                {saveCourseMutation.isPending ? "Salvando..." : "Salvar informacoes"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f9fafb_100%)] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <FolderPlus className="h-4 w-4" />
                  <CardTitle>Adicionar modulo</CardTitle>
                </div>
                <CardDescription>Crie a estrutura principal do curso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="module-title">Nome do modulo</Label>
                  <Input
                    id="module-title"
                    value={moduleTitle}
                    onChange={(event) => setModuleTitle(event.target.value)}
                    placeholder="Ex: Fundamentos e setup"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-description">Descricao</Label>
                  <Textarea
                    id="module-description"
                    rows={4}
                    value={moduleDescription}
                    onChange={(event) => setModuleDescription(event.target.value)}
                  />
                </div>
                <Button
                  disabled={
                    createModuleMutation.isPending ||
                    !moduleTitle.trim() ||
                    !moduleDescription.trim()
                  }
                  onClick={() => createModuleMutation.mutate()}
                >
                  {createModuleMutation.isPending ? "Criando..." : "Criar modulo"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f9fafb_100%)] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Video className="h-4 w-4" />
                  <CardTitle>Adicionar aula de video</CardTitle>
                </div>
                <CardDescription>
                  Use link do Vimeo, YouTube ou outro link externo para montar a trilha.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-module">Modulo</Label>
                  <select
                    id="lesson-module"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={lessonModuleId}
                    onChange={(event) => setLessonModuleId(event.target.value)}
                    disabled={data.modules.length === 0}
                  >
                    {data.modules.length === 0 ? <option value="">Crie um modulo primeiro</option> : null}
                    {data.modules.map((moduleItem) => (
                      <option key={moduleItem.id} value={moduleItem.id}>
                        Modulo {moduleItem.moduleOrder}: {moduleItem.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Titulo da aula</Label>
                  <Input
                    id="lesson-title"
                    value={lessonTitle}
                    onChange={(event) => setLessonTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-summary">Resumo da aula</Label>
                  <Textarea
                    id="lesson-summary"
                    rows={3}
                    value={lessonSummary}
                    onChange={(event) => setLessonSummary(event.target.value)}
                  />
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson-duration">Duracao</Label>
                    <Input
                      id="lesson-duration"
                      value={lessonDuration}
                      onChange={(event) => setLessonDuration(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson-vimeo">Link da aula</Label>
                    <Input
                      id="lesson-vimeo"
                      value={lessonVimeoUrl}
                      onChange={(event) => setLessonVimeoUrl(event.target.value)}
                      placeholder="https://vimeo.com/... ou https://youtu.be/... ou outro link"
                    />
                  </div>
                </div>
                <Button
                  disabled={
                    createLessonMutation.isPending ||
                    !lessonModuleId ||
                    !lessonTitle.trim() ||
                    !lessonVimeoUrl.trim()
                  }
                  onClick={() => createLessonMutation.mutate()}
                >
                  {createLessonMutation.isPending ? "Criando..." : "Criar aula"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfc_100%)] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  <CardTitle>Materiais do curso</CardTitle>
                </div>
                <CardDescription>
                  Cadastre PDF, indicador, planilha ou bonus sem sair do editor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resource-title">Titulo do material</Label>
                  <Input
                    id="resource-title"
                    value={resourceTitle}
                    onChange={(event) => setResourceTitle(event.target.value)}
                    placeholder="Ex: PDF da aula 1"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resource-module">Modulo</Label>
                    <select
                      id="resource-module"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={resourceModuleId}
                      onChange={(event) => {
                        setResourceModuleId(event.target.value);
                        setResourceLessonId("");
                      }}
                    >
                      <option value="">Sem modulo especifico</option>
                      {data.modules.map((moduleItem) => (
                        <option key={moduleItem.id} value={moduleItem.id}>
                          Modulo {moduleItem.moduleOrder}: {moduleItem.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-lesson">Aula</Label>
                    <select
                      id="resource-lesson"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={resourceLessonId}
                      onChange={(event) => setResourceLessonId(event.target.value)}
                      disabled={!resourceModuleId}
                    >
                      <option value="">
                        {resourceModuleId ? "Sem aula especifica" : "Escolha um modulo primeiro"}
                      </option>
                      {resourceModuleLessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          Aula {lesson.lessonOrder}: {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resource-kind">Tipo</Label>
                    <select
                      id="resource-kind"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={resourceKind}
                      onChange={(event) => setResourceKind(event.target.value as CourseResourceKind)}
                    >
                      <option value="pdf">PDF</option>
                      <option value="indicador">Indicador</option>
                      <option value="planilha">Planilha</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-url">Link do arquivo</Label>
                    <Input
                      id="resource-url"
                      value={resourceUrl}
                      onChange={(event) => setResourceUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resource-description">Descricao</Label>
                  <Textarea
                    id="resource-description"
                    rows={3}
                    value={resourceDescription}
                    onChange={(event) => setResourceDescription(event.target.value)}
                  />
                </div>
                <Button
                  disabled={
                    createResourceMutation.isPending ||
                    !resourceTitle.trim() ||
                    !resourceDescription.trim() ||
                    !resourceUrl.trim()
                  }
                  onClick={() => createResourceMutation.mutate()}
                >
                  {createResourceMutation.isPending ? "Criando..." : "Criar material"}
                </Button>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  {data.resources.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      Ainda nao existem materiais neste curso.
                    </div>
                  ) : (
                    data.resources.map((resource) => (
                      <div key={resource.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{resource.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {resource.kind}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              disabled={deleteResourceMutation.isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    "Deseja mesmo apagar este material do curso?",
                                  )
                                ) {
                                  return;
                                }

                                deleteResourceMutation.mutate(resource.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {resource.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {resource.moduleId ? (
                            <span className="rounded-full bg-secondary px-3 py-1">
                              {data.modules.find((moduleItem) => moduleItem.id === resource.moduleId)
                                ?.title ?? "Modulo"}
                            </span>
                          ) : null}
                          {resource.lessonId ? (
                            <span className="rounded-full bg-secondary px-3 py-1">
                              {data.lessons.find((lesson) => lesson.id === resource.lessonId)?.title ??
                                "Aula"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfc_100%)] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Link2 className="h-4 w-4" />
                  <CardTitle>Link de cadastro</CardTitle>
                </div>
                <CardDescription>
                  Gere a URL publica do curso direto daqui, sem ir para outro painel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-title">Nome do link</Label>
                  <Input
                    id="link-title"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    placeholder="Ex: Turma de abril"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-description">Descricao</Label>
                  <Textarea
                    id="link-description"
                    rows={3}
                    value={linkDescription}
                    onChange={(event) => setLinkDescription(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-slug">Slug opcional</Label>
                  <Input
                    id="link-slug"
                    value={linkSlug}
                    onChange={(event) => setLinkSlug(event.target.value)}
                    placeholder="curso-abril-2026"
                  />
                </div>
                <Button
                  disabled={
                    createLinkMutation.isPending ||
                    !linkTitle.trim() ||
                    !linkDescription.trim()
                  }
                  onClick={() => createLinkMutation.mutate()}
                >
                  {createLinkMutation.isPending ? "Criando..." : "Criar link de cadastro"}
                </Button>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  {data.links.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      Nenhum link de cadastro criado para este curso ainda.
                    </div>
                  ) : (
                    data.links.map((linkItem) => (
                      <div key={linkItem.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{linkItem.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {linkItem.description}
                            </p>
                            <p className="mt-3 text-xs text-primary">/cadastro/{linkItem.slug}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => void copyRegistrationLink(linkItem.slug)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 text-red-600 hover:text-red-700"
                              disabled={deleteLinkMutation.isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    "Deseja mesmo apagar este link de cadastro?",
                                  )
                                ) {
                                  return;
                                }

                                deleteLinkMutation.mutate(linkItem.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-border/60 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="h-4 w-4" />
                <CardTitle>Modulo selecionado</CardTitle>
              </div>
              <CardDescription>
                Esta area ajuda a revisar as aulas do modulo que voce esta montando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedModule ? (
                <>
                  <div className="rounded-[1.6rem] border border-amber-200 bg-[linear-gradient(135deg,#fff7e3_0%,#fff_100%)] p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-amber-700">
                          Modulo selecionado
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                          {selectedModule.title}
                        </p>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                          {selectedModule.description}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Aulas
                          </p>
                          <p className="mt-2 text-xl font-semibold text-slate-900">
                            {selectedModuleLessons.length}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Materiais
                          </p>
                          <p className="mt-2 text-xl font-semibold text-slate-900">
                            {selectedModuleResources.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedModuleLessons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                      Este modulo ainda nao possui aulas.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedModuleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(180deg,#fff_0%,#fafafa_100%)] p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-start gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-900">
                                {lesson.lessonOrder}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {lesson.title}
                                </p>
                                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {lesson.durationLabel}
                                </span>
                                {lesson.summary ? (
                                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {lesson.summary}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                disabled={
                                  reorderLessonsMutation.isPending ||
                                  lesson.lessonOrder === 1
                                }
                                onClick={() => handleMoveLesson(lesson.id, "up")}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                disabled={
                                  reorderLessonsMutation.isPending ||
                                  lesson.lessonOrder === selectedModuleLessons.length
                                }
                                onClick={() => handleMoveLesson(lesson.id, "down")}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-red-600 hover:text-red-700"
                                disabled={deleteLessonMutation.isPending}
                                onClick={() => deleteLessonMutation.mutate(lesson.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
                            <PlayCircle className="h-3.5 w-3.5" />
                            Link da aula configurado
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                  Escolha ou crie um modulo para continuar.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
