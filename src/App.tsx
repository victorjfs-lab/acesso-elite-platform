import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

const Home = lazy(() => import("@/pages/Home"));
const EnrollmentPage = lazy(() => import("@/pages/EnrollmentPage"));
const EliteAccessPage = lazy(() => import("@/pages/EliteAccessPage"));
const Login = lazy(() => import("@/pages/Login"));
const AppIndex = lazy(() => import("@/pages/AppIndex"));
const StudentHome = lazy(() => import("@/pages/StudentHome"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages/AdminProducts"));
const AdminCourseCreate = lazy(() => import("@/pages/AdminCourseCreate"));
const AdminCourseEditor = lazy(() => import("@/pages/AdminCourseEditor"));
const CoursePlayer = lazy(() => import("@/pages/CoursePlayer"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f6f1e8_0%,#f8fbfa_45%,#eef3f2_100%)]">
      <div className="rounded-3xl border border-border/70 bg-white/85 px-7 py-5 text-sm text-muted-foreground shadow-sm backdrop-blur">
        Carregando portal...
      </div>
    </div>
  );
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/acesso-elite" element={<EliteAccessPage />} />
              <Route path="/cadastro/:slug" element={<EnrollmentPage />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/app" element={<AppIndex />} />
                <Route path="/app/minha-area" element={<StudentHome />} />
                <Route path="/app/admin" element={<AdminDashboard />} />
                <Route path="/app/admin/produtos" element={<AdminProducts />} />
                <Route path="/app/admin/produtos/novo" element={<AdminCourseCreate />} />
                <Route path="/app/admin/produtos/:courseId" element={<AdminCourseEditor />} />
                <Route path="/app/curso/:courseId" element={<CoursePlayer />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
