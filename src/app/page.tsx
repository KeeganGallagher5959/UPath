import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-10 py-10">
      <Button
        nativeButton={false}
        render={<Link href="/auth/signup" />}
        className="h-12 w-full max-w-sm rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Sign up
      </Button>
      <Button
        nativeButton={false}
        render={<Link href="/auth/login" />}
        variant="outline"
        className="h-12 w-full max-w-sm rounded-xl border-primary text-lg font-semibold text-primary hover:bg-primary/5 hover:text-primary"
      >
        Login
      </Button>
    </div>
  );
}
