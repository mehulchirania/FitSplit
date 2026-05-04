import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="page" style={{ minHeight: "80vh", alignContent: "center" }}>
      <LoginForm />
    </main>
  );
}
