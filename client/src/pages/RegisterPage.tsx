import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "core/constants/role.ts";
import { signUp, useSession } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading...
      </div>
    );
  }

  if (session) {
    return (
      <Navigate
        to={session.user.role === Role.customer ? "/portal" : "/"}
        replace
      />
    );
  }

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");

    const { error } = await signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (error) {
      setServerError(error.message ?? "Registration failed");
      return;
    }

    navigate("/portal", { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-[400px] px-4 animate-in-page">
        <div className="flex flex-col items-center mb-10">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-5">
            <span className="text-primary-foreground font-bold text-xl">H</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a customer account
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 text-center">
            Submit and track support requests. Staff sign-in uses the same page
            with an existing account.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              You will only see tickets for your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && (
                <ErrorAlert message={serverError} className="mb-4" />
              )}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && (
                    <ErrorMessage message={errors.name.message} />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <ErrorMessage message={errors.email.message} />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <ErrorMessage message={errors.password.message} />
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
