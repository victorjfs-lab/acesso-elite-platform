import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  FolderKanban,
  GraduationCap,
  LogOut,
  Menu,
  PanelsTopLeft,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { academyRepository } from "@/lib/academy-repository";
import { formatPtText } from "@/lib/pt-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const { account, isDemoMode, signOut, session } = useAuth();
  const isStudentView = account?.role === "student";

  const { data: studentDashboard } = useQuery({
    queryKey: ["sidebar-student-dashboard", account?.id, session?.user.email],
    queryFn: () =>
      academyRepository.getStudentDashboard({
        accountId: account?.id,
        email: session?.user.email,
      }),
    enabled: isStudentView && Boolean(account?.id || session?.user.email),
  });

  const navItems = useMemo(() => {
    if (account?.role === "admin") {
      return [
        { to: "/app/admin/produtos", label: "Produtos", icon: FolderKanban },
        { to: "/app/admin", label: "Operação", icon: PanelsTopLeft },
      ];
    }

    return [{ to: "/app/minha-area", label: "Minha Área", icon: GraduationCap }];
  }, [account?.role]);

  const initials = useMemo(() => {
    return (
      account?.fullName
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "AC"
    );
  }, [account?.fullName]);

  const currentStudentCourseTitle = useMemo(() => {
    if (!isStudentView || !studentDashboard) {
      return null;
    }

    const courseMatch = location.pathname.match(/^\/app\/curso\/([^/]+)/);
    const currentCourseId = courseMatch?.[1] ?? null;

    if (!currentCourseId) {
      return null;
    }

    return (
      studentDashboard.activeAccess.find((access) => access.course.id === currentCourseId)?.course
        .title ?? null
    );
  }, [isStudentView, location.pathname, studentDashboard]);

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await signOut();
    setIsSigningOut(false);

    if (result.error) {
      toast({
        title: "Não foi possível sair",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sessão encerrada",
      description: "A área protegida foi fechada com segurança.",
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-screen",
        isStudentView
          ? "bg-[radial-gradient(circle_at_top,rgba(182,146,54,0.08),transparent_18%),linear-gradient(180deg,#0b0d10_0%,#101316_38%,#0d1114_100%)] text-white"
          : "bg-[linear-gradient(180deg,#f4f1ea_0%,#f6f5f1_42%,#f0f3f6_100%)]",
      )}
    >
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r text-white transition-transform duration-300 lg:static lg:translate-x-0",
          isStudentView
            ? "border-white/10 bg-[#090b0d]"
            : "border-[#d7d9df] bg-[#111419]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isStudentView
              ? "bg-[radial-gradient(circle_at_top_right,rgba(217,178,59,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(92,144,255,0.08),transparent_32%)]"
              : "bg-[radial-gradient(circle_at_top_right,rgba(217,178,59,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.10),transparent_35%)]",
          )}
        />

        <div className="relative flex h-24 items-center gap-3 border-b border-white/10 px-6">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner shadow-black/20",
              isStudentView ? "bg-white/5" : "bg-white/10",
            )}
          >
            <BookOpen className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-white/40">
              {isStudentView ? "Acesso" : "Academy"}
            </p>
            <p className="text-lg font-semibold text-white">
              {isStudentView ? "Acesso Elite" : "Portal de Cursos"}
            </p>
          </div>
          <button
            type="button"
            className="ml-auto text-white/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? isStudentView
                      ? "bg-white/10 text-white shadow-lg shadow-black/30"
                      : "bg-white text-slate-950 shadow-lg shadow-black/10"
                    : "text-white/72 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {isStudentView ? (
            <div className="pt-4">
              <div className="px-4 pb-3 text-[0.68rem] uppercase tracking-[0.28em] text-white/35">
                Seus cursos
              </div>
              <div className="space-y-2">
                {studentDashboard?.activeAccess.map((access) => {
                  const active =
                    location.pathname === `/app/curso/${access.course.id}` ||
                    (location.pathname === "/app/minha-area" &&
                      studentDashboard.activeAccess[0]?.course.id === access.course.id);

                  return (
                    <Link
                      key={access.course.id}
                      to={`/app/curso/${access.course.id}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                        active
                          ? "border-white/12 bg-white/10 text-white shadow-lg shadow-black/20"
                          : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.07] hover:text-white",
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-amber-200">
                        {String(access.course.title).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {formatPtText(access.course.title)}
                        </p>
                        <p className="truncate text-xs text-white/45">{access.lessons.length} aulas</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="relative border-t border-white/10 p-4">
          {isDemoMode ? (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-white/72">
              Modo demonstração ativo. Você pode testar o fluxo mesmo sem Supabase configurado.
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{account?.fullName ?? "Usuário"}</p>
              <p className="truncate text-xs text-white/60">{account?.email ?? "sem email"}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex h-20 items-center gap-4 px-4 backdrop-blur lg:px-8",
            isStudentView
              ? "border-b border-white/10 bg-[#0d1013]/80"
              : "border-b border-slate-200/80 bg-white/70",
          )}
        >
          <button type="button" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className={cn("h-6 w-6", isStudentView ? "text-white" : "text-slate-900")} />
          </button>
          <div className="flex-1">
            <p
              className={cn(
                "text-xs uppercase tracking-[0.3em]",
                isStudentView ? "text-white/45" : "text-primary/60",
              )}
            >
              {account?.role === "admin" ? "Operação" : "Estudos"}
            </p>
            <p className={cn("text-lg font-semibold", isStudentView ? "text-white" : "text-slate-900")}>
              {account?.role === "admin"
                ? location.pathname.startsWith("/app/admin/produtos")
                  ? "Estruture seus produtos e conteúdos"
                  : "Gerencie matrículas e acessos"
                : "Aproveite seu acesso elite"}
            </p>
            {currentStudentCourseTitle ? (
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/42">
                Curso atual: {formatPtText(currentStudentCourseTitle)}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "hidden rounded-full px-4 py-2 text-sm shadow-sm md:block",
              isStudentView
                ? "border border-white/10 bg-white/5 text-white/70"
                : "border border-slate-200 bg-white/85 text-slate-600",
            )}
          >
            {account?.role === "admin" ? "Perfil admin" : "Perfil aluno"}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
