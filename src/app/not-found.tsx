import { AppStatusScreen } from "@/components/app-status-screen";

export default function NotFound() {
  return (
    <AppStatusScreen
      body="The page you are looking for is not available in this workspace."
      code="404"
      eyebrow="Not found"
      primaryAction={{ label: "Go home", href: "/" }}
      secondaryAction={{ label: "About FitSplit", href: "/about" }}
      title="This page is not in FitSplit"
    />
  );
}
