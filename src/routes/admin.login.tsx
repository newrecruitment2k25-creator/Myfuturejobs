import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "Admin Login — MYFutureJobs" },
      { name: "description", content: "Admin portal login for MYFutureJobs governance console." },
    ],
  }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: "/login" }); }, []);
  return null;
}
