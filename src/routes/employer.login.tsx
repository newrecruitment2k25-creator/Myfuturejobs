import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/employer/login")({
  ssr: false,
  component: EmployerLoginPage,
  head: () => ({
    meta: [
      { title: "Employer Log In — MYFutureJobs" },
      { name: "description", content: "Log in to your MYFutureJobs employer account." },
    ],
  }),
});

function EmployerLoginPage() {
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: "/login" }); }, []);
  return null;
}