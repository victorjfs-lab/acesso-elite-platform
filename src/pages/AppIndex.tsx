import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AppIndex() {
  const { account } = useAuth();

  if (account?.role === "admin") {
    return <Navigate to="/app/admin/produtos" replace />;
  }

  return <Navigate to="/app/minha-area" replace />;
}
