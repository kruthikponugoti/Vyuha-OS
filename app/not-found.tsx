import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VyuhaWordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <VyuhaWordmark />
      <p className="mt-10 font-display text-6xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for may have moved, or the link is out of date.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>
        <Button asChild variant="outline"><Link href="/">Back home</Link></Button>
      </div>
    </div>
  );
}
