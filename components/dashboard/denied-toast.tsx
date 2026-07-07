"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MODULE_LABELS, type ModuleKey } from "@/lib/permissions";

// Shows a clear message when the route guard bounced a user here because their
// role can't access the module they tried to open (?denied=<module>).
export function DeniedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const denied = params.get("denied");

  React.useEffect(() => {
    if (!denied) return;
    const label = MODULE_LABELS[denied as ModuleKey] ?? "that section";
    toast.error(`You don't have access to ${label}.`, {
      description: "Ask an owner or admin if you need it.",
    });
    router.replace("/dashboard");
  }, [denied, router]);

  return null;
}
