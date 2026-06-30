import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/caseworker/$candidateId")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/admin/candidates/$candidateId", params: { candidateId: params.candidateId } });
  },
  component: () => null,
});
