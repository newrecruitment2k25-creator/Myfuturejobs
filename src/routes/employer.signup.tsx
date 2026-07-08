import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/employer/signup")({
  ssr: false,
  component: EmployerSignupPage,
  head: () => ({
    meta: [
      { title: "Employer Sign Up — MYFutureJobs" },
      { name: "description", content: "Create an employer account on MYFutureJobs to post jobs." },
    ],
  }),
});

function EmployerSignupPage() {
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: "/signup", search: { tab: "employer" } }); }, []);
  return null;
}