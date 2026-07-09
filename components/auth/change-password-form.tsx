"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { setNewPassword } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export function ChangePasswordForm() {
  const [state, action] = useFormState(setNewPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" placeholder="Repeat your password" required minLength={8} autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full">Set password &amp; continue</Button>
    </form>
  );
}
