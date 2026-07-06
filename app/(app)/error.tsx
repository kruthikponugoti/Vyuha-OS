"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TriangleAlert, RotateCw } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-destructive-soft text-destructive">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-display text-xl font-semibold">Something went wrong</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        This view hit an unexpected error. Your data is safe — try loading it again.
      </p>
      <Button onClick={reset} className="mt-6">
        <RotateCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
