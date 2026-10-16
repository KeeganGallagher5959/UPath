import Link from "next/link";
import { TransitMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <TransitMark className="size-24" />
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-balance">UPath</h1>
          <p className="max-w-xs text-base text-muted-foreground text-pretty">
            Plan your campus routes around your class schedule.
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Button
          nativeButton={false}
          render={<Link href="/auth/signup" />}
          className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Sign up
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/auth/login" />}
          variant="outline"
          className="h-12 w-full rounded-xl border-primary text-lg font-semibold text-primary hover:bg-primary/5 hover:text-primary"
        >
          Log in
        </Button>
      </div>
    </main>
  );
}
