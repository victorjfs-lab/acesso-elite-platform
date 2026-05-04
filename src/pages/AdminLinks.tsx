import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Copy, Link2, Search, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LINKS_PER_PAGE = 10;

function getFullLink(slug: string) {
  if (typeof window === "undefined") {
    return `/cadastro/${slug}`;
  }

  return `${window.location.origin}/cadastro/${slug}`;
}

export default function AdminLinks() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => academyRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => academyRepository.deleteEnrollmentLink(linkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Link removido",
        description: "O link de cadastro foi excluído do painel.",
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível excluir o link",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const courseTitleById = useMemo(() => {
    return new Map(
      data?.courseStructures.map((item) => [item.course.id, item.course.title]) ?? [],
    );
  }, [data]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLinks = useMemo(() => {
    const links = data?.links ?? [];

    if (!normalizedSearch) {
      return links;
    }

    return links.filter((link) =>
      [
        link.title,
        link.description,
        link.slug,
        courseTitleById.get(link.courseId),
        link.createdAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [courseTitleById, data?.links, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / LINKS_PER_PAGE));
  const visibleLinks = filteredLinks.slice(
    (currentPage - 1) * LINKS_PER_PAGE,
    currentPage * LINKS_PER_PAGE,
  );

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Carregando links de cadastro...
      </div>
    );
  }

  async function copyLink(slug: string) {
    const fullUrl = getFullLink(slug);
    await navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link copiado",
      description: fullUrl,
    });
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#ffffff_0%,#eef5ff_58%,#f8fafc_100%)] p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
              <Link2 className="h-3.5 w-3.5" />
              Links públicos
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950">
              Links de cadastro
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Todos os links ficam aqui, separados do painel principal, para copiar, revisar e
              apagar sem poluir a operação dos alunos.
            </p>
          </div>
          <div className="rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            {filteredLinks.length} link(s) ativo(s)
          </div>
        </div>
      </section>

      <section className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          placeholder="Buscar por nome do link, curso, slug ou data..."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleLinks.map((link) => (
          <Card key={link.id} className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="truncate">{link.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {courseTitleById.get(link.courseId) ?? "Curso não localizado"}
                  </CardDescription>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Ativo
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {link.description ? (
                <p className="text-sm leading-6 text-slate-500">{link.description}</p>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="break-all text-sm font-semibold text-primary">
                  /cadastro/{link.slug}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => void copyLink(link.slug)}
                  className="gap-2 rounded-xl"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deleteLinkMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(`Deseja excluir o link ${link.title}?`)) {
                      return;
                    }

                    deleteLinkMutation.mutate(link.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {visibleLinks.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-white">
          <CardContent className="p-6 text-sm text-slate-500">
            Nenhum link encontrado com esse filtro.
          </CardContent>
        </Card>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
