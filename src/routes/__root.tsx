import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { Chatbot } from "@/components/chatbot";
import { LanguageProvider } from "@/lib/language-context";
import { TranslationSyncer } from "@/components/translation-syncer";
import { SiteHeader } from "@/components/site-header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MYFutureJobs — PERKESO Employment Intelligence" },
      { name: "description", content: "AI-powered job matching, candidate scoring, skill gap analysis, and labour market intelligence for Malaysia's workforce. A PERKESO initiative." },
      { name: "author", content: "MYFutureJobs · PERKESO" },
      { property: "og:title", content: "MYFutureJobs — PERKESO Employment Intelligence" },
      { property: "og:description", content: "Semantic job matching, candidate scoring, taxonomy intelligence, and labour market insights for better employment outcomes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MYFutureJobs — PERKESO Employment Intelligence" },
      { name: "twitter:description", content: "AI-powered employment intelligence for Malaysia's workforce. A PERKESO initiative." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1aef61ca-53e4-4e28-9622-84224387bd6c/id-preview-2f95e12c--6a8b827d-3dd9-4394-b8f6-e2209d80f373.lovable.app-1779781152702.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1aef61ca-53e4-4e28-9622-84224387bd6c/id-preview-2f95e12c--6a8b827d-3dd9-4394-b8f6-e2209d80f373.lovable.app-1779781152702.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const AUTH_ONLY_ROUTES = ["/login", "/signup", "/employer/login", "/employer/signup", "/admin/login"];

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  const isAuthPage = AUTH_ONLY_ROUTES.includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TranslationSyncer />
          {!isAuthPage && <SiteHeader />}
          <div id="app-root" className={isAuthPage ? "" : "app-content"}>
            <Outlet />
          </div>
          <Toaster />
          {!isAuthPage && <Chatbot />}
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
