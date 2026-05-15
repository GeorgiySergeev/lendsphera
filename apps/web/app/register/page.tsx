"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import axios from "axios";
import { z } from "zod";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "@workspace/ui";

import { register } from "../../lib/api/auth";
import { useAuthStore } from "../../stores/auth-store";
import { GoogleButton } from "../../components/auth/google-button";

// ────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────

const registerFormSchema = z
  .object({
    name: z.string().min(1, "Name is required.").max(120),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password.")
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const DEFAULT_REDIRECT = "/dashboard";

function isSafeRedirect(path: string | null): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

function mapServerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 409) return "This email is already registered. Try signing in.";
    if (status === 429) return "Too many attempts. Please wait a minute and try again.";
    if (status === 400) return "Please check your details and try again.";
    if (!error.response) return "Network error. Check your connection and retry.";
  }
  return "Unexpected error. Please try again.";
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const [serverError, setServerError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");
  const redirectTo = isSafeRedirect(nextParam) ? nextParam : DEFAULT_REDIRECT;

  const {
    register: rhfRegister,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" }
  });

  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, redirectTo, router]);

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password
      });
      router.replace(redirectTo);
    } catch (error) {
      setServerError(mapServerError(error));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join the LendSphera landing page builder.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleButton />

          <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="Jane Smith"
                aria-invalid={Boolean(errors.name) || undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                disabled={isSubmitting}
                {...rhfRegister("name")}
              />
              {errors.name ? (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email) || undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={isSubmitting}
                {...rhfRegister("email")}
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password) || undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={isSubmitting}
                {...rhfRegister("password")}
              />
              {errors.password ? (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.confirmPassword) || undefined}
                aria-describedby={
                  errors.confirmPassword ? "confirm-password-error" : undefined
                }
                disabled={isSubmitting}
                {...rhfRegister("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            {serverError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="mx-auto h-8 w-48 animate-pulse rounded-md bg-muted" />
              <div className="mx-auto h-4 w-72 animate-pulse rounded-md bg-muted" />
            </CardHeader>
          </Card>
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
