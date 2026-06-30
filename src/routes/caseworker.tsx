import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/caseworker")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/candidates" });
  },
  component: () => null,
});
