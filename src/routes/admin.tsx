import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
