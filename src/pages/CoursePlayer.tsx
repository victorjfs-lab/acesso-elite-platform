import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileBarChart2,
  FileText,
  Lock,
  PlayCircle,
  Search,
  Video,
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { formatPtText } from "@/lib/pt-display";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const defaultFinanceHero =
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80";

function resourceLabel(kind: string) {
  switch (kind) {
    case "indicador":
      return "Indicador";
    case "planilha":
      return "Planilha";
    case "bonus":
      return "Bonus";
    default:
      return "PDF";
  }
}

function normalizeVimeoEmbedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  const value = rawUrl.trim();
  if (!value) {
    return null;
  }

  if (value.includes("player.vimeo.com/video/")) {
    return value;
  }

  const match = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : value;
}

function normalizeYouTubeEmbedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  const value = rawUrl.trim();
  if (!value) {
    return null;
  }

  if (value.includes("youtube.com/embed/")) {
    return value;
  }

  const watchMatch = value.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  const shortMatch = value.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  return shortMatch?.[1] ? `https://www.youtube.com/embed/${shortMatch[1]}` : null;
}

function getLessonMedia(url: string | null | undefined) {
  const vimeoEmbedUrl = normalizeVimeoEmbedUrl(url);

  if (vimeoEmbedUrl && vimeoEmbedUrl.includes("player.vimeo.com/video/")) {
    return {
      provider: "Vimeo",
      embedUrl: vimeoEmbedUrl,
      externalUrl: url ?? vimeoEmbedUrl,
    };
  }

  const youtubeEmbedUrl = normalizeYouTubeEmbedUrl(url);

  if (youtubeEmbedUrl) {
    return {
      provider: "YouTube",
      embedUrl: youtubeEmbedUrl,
      externalUrl: url ?? youtubeEmbedUrl,
    };
  }

  return {
    provider: "Link externo",
    embedUrl: null,
    externalUrl: url ?? null,
  };
}

function getCleanLessonSummary(rawSummary: string | null | undefined) {
  const value = rawSummary?.trim();
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (
    normalized === "videoaula migrada do tutor lms para a nova plataforma." ||
    normalized === "videoaula migrada do tutor lms para a nova plataforma"
  ) {
    return null;
  }

  return value;
}

function parseLessonDurationSeconds(durationLabel: string | null | undefined) {
  const value = durationLabel?.trim().toLowerCase() ?? "";

  if (!value) {
    return 4 * 60;
  }

  const hourMatch = value.match(/(\d+)\s*h/);
  const minuteMatch = value.match(/(\d+)\s*min/);
  const secondMatch = value.match(/(\d+)\s*s/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number(secondMatch[1]) : 0;
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? total : 4 * 60;
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getDisplayLessonTitle(title: string | null | undefined) {
  const value = title?.trim();
  if (!value) {
    return "";
  }

  return value.replace(/^aula\s*\d+\s*[-:]\s*/i, "").trim();
}

export default function CoursePlayer() {
  const { courseId = "" } = useParams();
  const { account, session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedLessonStartedAt, setSelectedLessonStartedAt] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["course-detail", courseId, account?.id, session?.user.email],
    queryFn: () =>
      academyRepository.getCourseDetail(courseId, {
        accountId: account?.id,
        email: session?.user.email,
      }),
    enabled: Boolean(courseId && (account?.id || session?.user.email)),
  });

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      academyRepository.completeLesson({
        courseId,
        lessonId,
        accountId: account?.id,
        email: session?.user.email,
      }),
    onSuccess: async (_result, lessonId) => {
      const currentIndex = data?.lessons.findIndex((lesson) => lesson.id === lessonId) ?? -1;
      const nextLesson = currentIndex >= 0 ? data?.lessons[currentIndex + 1] ?? null : null;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["course-detail", courseId, account?.id, session?.user.email],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-dashboard", account?.id, session?.user.email],
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidebar-student-dashboard", account?.id, session?.user.email],
        }),
      ]);

      if (nextLesson) {
        setSelectedLessonId(nextLesson.id);
      }
    },
  });

  const startLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      academyRepository.startLesson({
        courseId,
        lessonId,
        accountId: account?.id,
        email: session?.user.email,
      }),
    onSuccess: (startedAt, lessonId) => {
      if (selectedLessonId === lessonId) {
        setSelectedLessonStartedAt(startedAt);
      }

      void queryClient.invalidateQueries({
        queryKey: ["course-detail", courseId, account?.id, session?.user.email],
      });
    },
  });

  const completedLessonSet = useMemo(
    () => new Set(data?.completedLessonIds ?? []),
    [data?.completedLessonIds],
  );
  const availableLessonSet = useMemo(
    () => new Set(data?.availableLessonIds ?? []),
    [data?.availableLessonIds],
  );
  const availableModuleSet = useMemo(
    () => new Set(data?.availableModuleIds ?? []),
    [data?.availableModuleIds],
  );

  useEffect(() => {
    if (!data?.lessons.length) {
      return;
    }

    const preferredLessonId =
      (selectedLessonId && availableLessonSet.has(selectedLessonId) ? selectedLessonId : null) ??
      data.nextLesson?.id ??
      data.availableLessonIds[0] ??
      data.lessons[0]?.id;

    if (preferredLessonId && preferredLessonId !== selectedLessonId) {
      setSelectedLessonId(preferredLessonId);
    }
  }, [availableLessonSet, data, selectedLessonId]);

  const selectedLesson = useMemo(
    () =>
      data?.lessons.find((lesson) => lesson.id === selectedLessonId) ??
      (data?.nextLesson ? data.lessons.find((lesson) => lesson.id === data.nextLesson?.id) : null) ??
      data?.lessons[0] ??
      null,
    [data, selectedLessonId],
  );

  const selectedLessonMedia = getLessonMedia(selectedLesson?.vimeoUrl);
  const selectedLessonSummary = getCleanLessonSummary(selectedLesson?.summary);
  const selectedLessonDisplayTitle = getDisplayLessonTitle(selectedLesson?.title);
  const selectedLessonCompleted = selectedLesson ? completedLessonSet.has(selectedLesson.id) : false;
  const selectedLessonAvailable = selectedLesson ? availableLessonSet.has(selectedLesson.id) : false;
  const selectedLessonRequiredSeconds = parseLessonDurationSeconds(selectedLesson?.durationLabel);
  const selectedLessonElapsedSeconds = selectedLessonStartedAt
    ? Math.max(0, Math.floor((currentTime - new Date(selectedLessonStartedAt).getTime()) / 1000))
    : 0;
  const selectedLessonRemainingSeconds = Math.max(
    0,
    selectedLessonRequiredSeconds - selectedLessonElapsedSeconds,
  );
  const canCompleteSelectedLesson =
    Boolean(selectedLesson) &&
    selectedLessonAvailable &&
    !selectedLessonCompleted &&
    selectedLessonRemainingSeconds <= 0;

  const filteredModules = useMemo(() => {
    if (!data) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();

    return data.modules
      .map((moduleItem) => {
        const lessons = data.lessons.filter((lesson) => lesson.moduleId === moduleItem.id);
        const filteredLessons = term
          ? lessons.filter(
              (lesson) =>
                lesson.title.toLowerCase().includes(term) ||
                lesson.summary.toLowerCase().includes(term) ||
                moduleItem.title.toLowerCase().includes(term),
            )
          : lessons;

        return {
          ...moduleItem,
          lessons: filteredLessons,
          totalLessons: lessons.length,
          isUnlocked: availableModuleSet.has(moduleItem.id),
        };
      })
      .filter((moduleItem) => moduleItem.lessons.length > 0);
  }, [availableModuleSet, data, searchTerm]);

  const visibleResources = useMemo(() => {
    if (!data || !selectedLesson) {
      return [];
    }

    return data.resources.filter((resource) => {
      if (resource.lessonId) {
        return resource.lessonId === selectedLesson.id;
      }

      if (resource.moduleId) {
        return resource.moduleId === selectedLesson.moduleId;
      }

      return true;
    });
  }, [data, selectedLesson]);

  useEffect(() => {
    if (!selectedLesson) {
      setSelectedLessonStartedAt(null);
      return;
    }

    const startedAtFromData = data?.startedLessonAtById?.[selectedLesson.id] ?? null;

    if (!selectedLessonAvailable || selectedLessonCompleted) {
      setSelectedLessonStartedAt(startedAtFromData);
      return;
    }

    if (startedAtFromData) {
      setSelectedLessonStartedAt(startedAtFromData);
      return;
    }

    if (startLessonMutation.isPending) {
      return;
    }

    startLessonMutation.mutate(selectedLesson.id);
  }, [
    courseId,
    data?.startedLessonAtById,
    selectedLesson,
    selectedLessonAvailable,
    selectedLessonCompleted,
    startLessonMutation.isPending,
    startLessonMutation,
  ]);

  useEffect(() => {
    if (!selectedLesson || !selectedLessonAvailable || selectedLessonCompleted) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [selectedLesson, selectedLessonAvailable, selectedLessonCompleted]);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-5 text-sm text-white/60 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        Carregando o curso...
      </div>
    );
  }

  if (!data) {
    return <Navigate to="/app/minha-area" replace />;
  }

  const isExpired =
    account?.role === "student" &&
    (data.enrollment === null || new Date(data.enrollment.expiresAt).getTime() < Date.now());

  const currentModule = data.modules.find((moduleItem) => moduleItem.id === selectedLesson?.moduleId);
  const showcaseHero = data.course.heroImage?.trim() || defaultFinanceHero;
  const unlockedModuleCount = data.availableModuleIds.length;

  return (
    <div className="space-y-6 text-white">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101317] shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:rounded-[2rem]">
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${showcaseHero})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,10,12,0.96)_0%,rgba(8,10,12,0.82)_52%,rgba(8,10,12,0.58)_100%)]" />

          <div className="relative p-5 sm:p-8">
            <Link
              to="/app/minha-area"
              className="inline-flex items-center gap-2 text-base font-medium text-white/78 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>

            <div className="mt-5 grid gap-5 xl:mt-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end xl:gap-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/75">
                  {formatPtText(currentModule?.title ?? data.course.subtitle)}
                </p>
                <div className="mt-4 inline-flex max-w-full rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                  <h1 className="text-2xl leading-tight tracking-[-0.03em] text-white sm:text-[2.2rem] xl:text-[2.8rem]">
                    {formatPtText(selectedLessonDisplayTitle || data.course.title)}
                  </h1>
                </div>
                {selectedLessonSummary ? (
                  <p className="mt-3 hidden max-w-3xl text-base leading-7 text-white/68 sm:block sm:text-lg sm:leading-8">
                    {formatPtText(selectedLessonSummary)}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3 sm:rounded-[1.35rem] sm:p-4">
                  <Video className="h-4 w-4 text-amber-200" />
                  <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-white/42 sm:mt-3 sm:text-xs sm:tracking-[0.24em]">
                    Aulas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-xl">
                    {data.lessons.length}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3 sm:rounded-[1.35rem] sm:p-4">
                  <FileText className="h-4 w-4 text-amber-200" />
                  <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-white/42 sm:mt-3 sm:text-xs sm:tracking-[0.24em]">
                    Materiais
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-xl">
                    {data.resources.length}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3 sm:rounded-[1.35rem] sm:p-4">
                  <Clock3 className="h-4 w-4 text-amber-200" />
                  <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-white/42 sm:mt-3 sm:text-xs sm:tracking-[0.24em]">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-xl">
                    {isExpired ? "Expirado" : "Ativo"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isExpired ? (
        <Card className="border-amber-500/20 bg-amber-500/10 text-amber-50">
          <CardContent className="p-6">
            <p className="text-lg font-semibold">Acesso expirado</p>
            <p className="mt-2 leading-7 text-amber-50/85">
              O prazo terminou para este curso. No admin voce pode renovar o acesso e escolher um
              novo periodo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0f1316] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
              <div className="aspect-video bg-black">
                {selectedLesson && selectedLessonAvailable && selectedLessonMedia.embedUrl ? (
                  <iframe
                    title={selectedLesson.title}
                    src={selectedLessonMedia.embedUrl}
                    className="h-full w-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : selectedLesson &&
                  selectedLessonAvailable &&
                  !selectedLessonMedia.externalUrl &&
                  visibleResources.length > 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                    Esta aula foi criada para disponibilizar materiais de apoio. Veja os arquivos
                    logo abaixo.
                  </div>
                ) : selectedLesson && selectedLessonAvailable && !selectedLessonMedia.externalUrl ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                    Esta aula ja esta criada na trilha, mas o video ainda nao foi definido no editor.
                  </div>
                ) : selectedLesson && selectedLessonAvailable ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                    Este conteúdo não pode ser incorporado automaticamente. Abra a aula no link
                    externo abaixo.
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/65">
                    Esta aula ainda não está disponível. Conclua a anterior ou aguarde a liberação
                    do próximo módulo.
                  </div>
                )}
              </div>

              <div className="grid gap-5 border-t border-white/10 p-6 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <div className="inline-flex max-w-full rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <h2 className="text-[1.85rem] leading-tight tracking-[-0.03em] text-white">
                      {formatPtText(selectedLessonDisplayTitle)}
                    </h2>
                  </div>
                  {selectedLessonSummary ? (
                    <p className="mt-4 max-w-3xl leading-7 text-white/62">
                      {formatPtText(selectedLessonSummary)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedLesson?.vimeoUrl &&
                  !selectedLessonMedia.embedUrl &&
                  selectedLessonAvailable ? (
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                      <a
                        href={selectedLessonMedia.externalUrl ?? selectedLesson.vimeoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir conteudo
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}

                  {selectedLesson && selectedLessonAvailable ? (
                    selectedLessonCompleted ? (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Aula concluída
                      </div>
                    ) : (
                      <Button
                        onClick={() => completeLessonMutation.mutate(selectedLesson.id)}
                        disabled={completeLessonMutation.isPending || !canCompleteSelectedLesson}
                        className="bg-white text-slate-950 hover:bg-white/90"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {completeLessonMutation.isPending
                          ? "Concluindo..."
                          : canCompleteSelectedLesson
                            ? "Concluir aula"
                            : `Liberado em ${formatCountdown(selectedLessonRemainingSeconds)}`}
                      </Button>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-sm font-medium text-amber-100">
                      <Lock className="h-4 w-4" />
                    Conclua a aula anterior para continuar
                    </div>
                  )}
                </div>
              </div>
            </section>

            {selectedLessonSummary ? (
              <section className="rounded-[1.8rem] border border-white/10 bg-[#101418] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                <div className="border-b border-white/10 pb-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/38">
                    Informações da aula
                  </p>
                  <h3 className="mt-3 text-2xl text-white">Descrição</h3>
                </div>
                <div className="mt-6 space-y-4 leading-8 text-white/72">
                  <p>{formatPtText(selectedLessonSummary)}</p>
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.8rem] border border-white/10 bg-[#101418] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/38">Biblioteca</p>
                  <h3 className="mt-2 text-2xl text-white">Materiais de apoio</h3>
                </div>
                <p className="text-sm text-white/45">
                  Apenas os materiais ligados a esta aula ou ao modulo atual.
                </p>
              </div>

              {visibleResources.length === 0 ? (
                <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                  Esta aula nao possui materiais de apoio vinculados.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {visibleResources.map((resource) => (
                    <article
                      key={resource.id}
                      className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
                        {resource.kind === "indicador" ? (
                          <FileBarChart2 className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        {resourceLabel(resource.kind)}
                      </div>
                      <h4 className="mt-4 text-xl text-white">{formatPtText(resource.title)}</h4>
                      <p className="mt-3 text-sm leading-7 text-white/58">
                        {formatPtText(resource.description)}
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      >
                        <a href={resource.fileUrl} target="_blank" rel="noreferrer">
                          Abrir material
                        </a>
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="xl:sticky xl:top-28 xl:h-[calc(100vh-8.5rem)]">
            <div className="flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#111519] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="border-b border-white/10 p-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/55">
                  Trilha do curso
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar conteudo"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/30"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {filteredModules.map((moduleItem, moduleIndex) => (
                    <div
                      key={moduleItem.id}
                      className={`overflow-hidden rounded-[1.35rem] border ${
                        moduleItem.isUnlocked
                          ? "border-white/10 bg-[#171b20]"
                          : "border-white/8 bg-[#14181d]/70"
                      }`}
                    >
                      <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(217,178,59,0.14),rgba(255,255,255,0.02))] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-sm font-semibold text-white">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-6 text-white">
                              {formatPtText(moduleItem.title)}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/38">
                              {moduleItem.isUnlocked
                                ? `${moduleItem.totalLessons} aulas`
                                : `Libera em ${Math.max(1, moduleItem.moduleOrder - unlockedModuleCount)} dia(s)`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 p-3">
                        {moduleItem.lessons.map((lesson) => {
                          const active = selectedLesson?.id === lesson.id;
                          const isCompleted = completedLessonSet.has(lesson.id);
                          const isAvailable = availableLessonSet.has(lesson.id);
                          const isModuleUnlocked = availableModuleSet.has(moduleItem.id);
                          const isLocked = !isModuleUnlocked || !isAvailable;

                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              disabled={isLocked}
                              onClick={() => {
                                if (!isLocked) {
                                  setSelectedLessonId(lesson.id);
                                }
                              }}
                              className={`w-full rounded-[1rem] border px-3 py-3 text-left transition ${
                                active
                                  ? "border-white/15 bg-white/10"
                                  : isLocked
                                    ? "cursor-not-allowed border-transparent bg-transparent opacity-55"
                                    : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    active
                                      ? "bg-white text-slate-950"
                                      : isLocked
                                        ? "bg-white/5 text-white/45"
                                        : "bg-white/5 text-white/75"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                  ) : active ? (
                                    <PlayCircle className="h-4 w-4" />
                                  ) : isLocked ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-sm font-medium text-white">
                                    {formatPtText(lesson.title)}
                                  </p>
                                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/38">
                                    <span>{lesson.durationLabel}</span>
                                    <span className="inline-flex items-center gap-1">
                                      {isCompleted ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                          Concluída
                                        </>
                                      ) : isAvailable ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                          Disponível
                                        </>
                                      ) : !isModuleUnlocked ? (
                                        <>
                                          <Lock className="h-3.5 w-3.5 text-amber-200" />
                                          Módulo bloqueado
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="h-3.5 w-3.5 text-amber-200" />
                                          Conclua a anterior
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredModules.length === 0 ? (
                    <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                      Nenhuma aula encontrada com esse termo.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
