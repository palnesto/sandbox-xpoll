import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import BGURL2 from "@/assets/login2.webp";
import BGURL from "@/assets/login.webp";
import CommonButton from "@/components/commons/CommonButton";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { HOME_ROUTE } from "@/sandbox/config";
import { signIn } from "@/sandbox/session";
import {
  clearAuthIntent,
  clearOnboardingIntent,
} from "@/lib/redirection/auth-intent";

/**
 * Sandbox login.
 *
 * No backend call — credentials are checked against the fixed sandbox pair and
 * a local session is written. See src/sandbox/config.ts.
 */

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { username: "", password: "" },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to={HOME_ROUTE} replace />;

  const onSubmit = async (values: LoginForm) => {
    setIsSubmittingLogin(true);
    setServerError(null);

    if (!signIn(values.username, values.password)) {
      setServerError("Those credentials don't match the demo account.");
      setIsSubmittingLogin(false);
      return;
    }

    // The demo always starts at home, so discard any stored deep-link intent
    // that DefaultLayout would otherwise redirect to.
    clearAuthIntent();
    clearOnboardingIntent();

    // Drop the cached 401 from the pre-login /me probe, then land on home.
    await queryClient.invalidateQueries({ queryKey: [endpoints.profile.me] });
    navigate(HOME_ROUTE, { replace: true });
  };

  return (
    <div className="text-black min-h-[100dvh] overflow-hidden relative">
      <img
        src={BGURL}
        alt=""
        className="lg:hidden h-full w-full object-fill absolute"
      />
      <img
        src={BGURL2}
        alt=""
        className="hidden lg:block h-full w-full object-cover absolute"
      />

      <header className="fixed inset-x-0 top-0 z-20 md:hidden h-32 bg-[#0DACAD] flex items-center gap-3 px-4">
        <h1 className="text-xl text-white">Sign in</h1>
      </header>

      <div className="absolute z-10 flex flex-col min-h-screen items-start top-[25%] md:top-0 md:justify-center px-4 sm:px-6 md:ml-16 md:p-8 md:pt-0 w-full max-w-[440px]">
        <header className="mb-8 hidden md:block">
          <h1 className="text-lg font-medium">Sign in</h1>
          <p className="mt-1 text-[13px] text-gray-600">
            Prototype environment — demo data only.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div>
            <label
              htmlFor="username"
              className="block text-[11px] font-semibold tracking-[0.18em]"
            >
              USERNAME
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              {...register("username")}
              className="border-0 border-b-2 focus:border-emerald-500 bg-transparent text-[15px] placeholder:text-gray-400 focus-visible:ring-0"
            />
            {errors.username && (
              <p className="text-xs text-red-600 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold tracking-[0.18em]"
            >
              PASSWORD
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register("password")}
              className="border-0 border-b-2 focus:border-emerald-500 bg-transparent text-[15px] placeholder:text-gray-400 focus-visible:ring-0"
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-600" role="alert">
              {serverError}
            </p>
          )}

          <div className="pt-6 text-center">
            <CommonButton
              text={isSubmittingLogin ? "Signing in…" : "Next"}
              type="submit"
              disabled={!isValid || isSubmittingLogin}
              className="disabled:opacity-50"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
