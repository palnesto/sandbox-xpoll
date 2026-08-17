import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appToast } from "@/utils/toast";
import { motion } from "framer-motion";

import { Mail } from "lucide-react"; // lucide mail icon
import googleLogo from "@/assets/google.webp"; // PNG of Google
import twitterLogo from "@/assets/x.svg"; // SVG of Twitter

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useApiQuery(endpoints.profile.me, {
    retry: false,
  });

  const me = data?.data?.data;
  const [step, setStep] = useState<"init" | "verify">("init");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const initiateLink = useApiMutation<
    { email: string; password: string },
    { email: string }
  >({
    route: endpoints.auth.linkEmailInitiate,
    method: "POST",
    onSuccess: () => {
      appToast.success("OTP sent! Check your inbox.");
      setStep("verify");
    },
  });

  const verifyLink = useApiMutation<{ otp: string }, { email: string }>({
    route: endpoints.auth.linkEmailVerify,
    method: "POST",
    onSuccess: () => {
      appToast.success("Email/password linked!");
      refetch();
      setStep("init");
      setEmail("");
      setPassword("");
      setOtp("");
    },
  });

  const handleLinkGoogle = () => {
    const returnTo = encodeURIComponent(
      `${import.meta.env.VITE_CLIENT_URL}/settings`,
    );
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}${
      endpoints.auth.oauthGoogleLink
    }?returnTo=${returnTo}`;
  };
  const handleLinkTwitter = () => {
    const returnTo = encodeURIComponent(
      `${import.meta.env.VITE_CLIENT_URL}/settings`,
    );
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}${
      endpoints.auth.oauthTwitterLink
    }?returnTo=${returnTo}`;
  };

  if (authLoading || isLoading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold text-center mb-6">
        Account Settings
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl bg-white p-6 shadow-lg overflow-hidden"
      >
        <div className="absolute right-3 top-3 opacity-10">
          <Mail className="w-16 h-16 text-gray-500" />
        </div>
        <h2 className="font-bold text-lg mb-4">Email / Password</h2>
        {me.hasEmail ? (
          <p className="text-green-600 font-medium">
            ✔ You already have a password login
          </p>
        ) : (
          <div className="space-y-3">
            {step === "init" ? (
              <>
                <Input
                  type="email"
                  placeholder="Email to link"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  onClick={() => initiateLink.mutate({ email, password })}
                  disabled={initiateLink.isLoading || !email || !password}
                  className="w-full"
                >
                  {initiateLink.isLoading ? "Sending OTP…" : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <Button
                  onClick={() => verifyLink.mutate({ otp })}
                  disabled={verifyLink.isLoading || otp.length !== 6}
                  className="w-full"
                >
                  {verifyLink.isLoading ? "Verifying…" : "Verify & Link"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Didn’t get it?{" "}
                  <button className="underline" onClick={() => setStep("init")}>
                    Send again
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative rounded-2xl bg-white p-6 shadow-lg overflow-hidden"
      >
        <div className="absolute right-3 top-3 opacity-10">
          <img src={googleLogo} alt="Google" className="w-16 h-16" />
        </div>
        <h2 className="font-bold text-lg mb-4">Google</h2>
        {me.connectedProviders.includes("google") ? (
          <section className="font-medium">
            <p className="font-mono">{me.googleEmail}</p>
            <p className="text-green-600 ">✔ Google linked</p>
          </section>
        ) : (
          <Button onClick={handleLinkGoogle} className="w-full">
            Link Google
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative rounded-2xl bg-white p-6 shadow-lg overflow-hidden"
      >
        <div className="absolute right-3 top-3 opacity-10">
          <img src={twitterLogo} alt="Twitter" className="w-16 h-16" />
        </div>
        <h2 className="font-bold text-lg mb-4">Twitter</h2>
        {me.connectedProviders.includes("twitter") ? (
          <section className="font-medium">
            <p className="font-mono">{me.twitterUsername}</p>
            <p className="text-green-600 ">✔ Twitter linked</p>
          </section>
        ) : (
          <Button
            onClick={handleLinkTwitter}
            className="w-full bg-sky-500 hover:bg-sky-600"
          >
            Link Twitter
          </Button>
        )}
      </motion.div>

      <GrwbLinkCard me={me} refetch={refetch} />
    </div>
  );
}

type LinkedSnapshot = {
  grwbUserId: string;
  email: string | null;
  name: string | null;
  walletAddress: string | null;
  chain: "SUI" | "XRP" | string | null;
  bgColor: "red" | "blue" | "white" | "purple" | null;
  energy: number | null;
  coins: number | null;
  level: number | null;
  location: null | { _id: string; name: string; imageUrl: string | null };
  avatar: null | { _id: string; imageUrl: string };
  linkedAt?: string | Date;
};

export function GrwbLinkCard({
  me,
  refetch,
}: {
  me: any;
  refetch: () => void;
}) {
  const linked: LinkedSnapshot | null = useMemo(
    () => me?.linkedGrwbAccount ?? null,
    [me],
  );
  const [step, setStep] = useState<"init" | "verify">("init");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const { data: grwbUser } = useApiQuery(endpoints.grwb.getGRWBUser);
  const grwbUserData = grwbUser?.data?.data;

  const initiate = useApiMutation<{ email: string }, { ok: true }>({
    route: endpoints?.grwb?.linkInitiate,
    method: "POST",
    onSuccess: () => {
      appToast.success("OTP sent to GRWB email");
      setStep("verify");
    },
  });

  const verify = useApiMutation<{ otp: string }, { ok: true }>({
    route: endpoints?.grwb?.linkVerify,
    method: "POST",
    onSuccess: () => {
      appToast.success("GRWB account linked!");
      setOtp("");
      setEmail("");
      setStep("init");
      refetch();
    },
  });

  const unlink = useApiMutation<{}, { ok: true }>({
    route: endpoints?.grwb?.linkUnlink,
    method: "POST",
    onSuccess: () => {
      appToast.success("GRWB account unlinked");
      refetch();
    },
  });

  const [exportCooldownUntil, setExportCooldownUntil] = useState<number | null>(
    null,
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!exportCooldownUntil) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [exportCooldownUntil]);

  const remainingSeconds = exportCooldownUntil
    ? Math.max(0, Math.ceil((exportCooldownUntil - Date.now()) / 1000))
    : 0;

  const startCooldown = (ms: number) => {
    const until = Date.now() + ms;
    setExportCooldownUntil(until);
    setTimeout(() => setExportCooldownUntil(null), ms + 250);
  };

  const sendGRWBInterationMailRequest = useApiMutation({
    route: endpoints.grwb.sendGRWBInterationMailRequest,
    method: "POST",
    onSuccess: (res) => {
      if (res?.statusCode === 202) {
        appToast.success(
          "Your poll interaction report has been sent to your registered email",
        );
        startCooldown(60_000);
      }
    },
    onError: (err: any) => {
      const status = err?.response?.data?.statusCode;
      if (status === 429) {
        const resetAt = err?.response?.data?.resetAt
          ? new Date(err.response.data.resetAt).getTime()
          : Date.now() + 60_000;
        const ms = Math.max(0, resetAt - Date.now());
        startCooldown(ms || 60_000);

        appToast.error(
          "You’ve already requested an export. Try again in 60 seconds.",
        );
        return;
      }
      appToast.error("Something went wrong while requesting the report");
    },
  });

  const handleRequestExport = () => {
    if (exportCooldownUntil && Date.now() < exportCooldownUntil) {
      appToast.error(
        "You’ve already requested an export. Try again in 60 seconds.",
      );
      return;
    }
    sendGRWBInterationMailRequest.mutate({});
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="relative rounded-2xl bg-white p-6 shadow-lg overflow-hidden"
    >
      <h2 className="font-bold text-lg mb-4">GRWB Account Link</h2>

      {linked ? (
        <>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Linked ✅</p>
            {linked?.email && (
              <p>
                <span className="font-semibold">Email:</span> {linked.email}
              </p>
            )}
            {linked.name && (
              <p>
                <span className="font-semibold">Name:</span> {linked.name}
              </p>
            )}
            <p>
              <span className="font-semibold">Level:</span>{" "}
              {linked?.level ?? "-"}
            </p>
            {linked.chain && (
              <p>
                <span className="font-semibold">Chain:</span>{" "}
                {linked?.chain ?? "-"}
              </p>
            )}
            {linked.walletAddress && (
              <p className="break-all">
                <span className="font-semibold">Wallet:</span>{" "}
                {linked?.walletAddress ?? "-"}
              </p>
            )}
            <p>
              <span className="font-semibold">BG Color:</span>{" "}
              {linked?.bgColor ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Energy:</span>{" "}
              {grwbUserData?.energy ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Coins:</span>{" "}
              {grwbUserData?.coins ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Location:</span>{" "}
              {linked.location?.name ?? "-"}
            </p>

            {linked.avatar?.imageUrl ? (
              <div className="mt-2">
                <img
                  src={linked.avatar.imageUrl}
                  alt="GRWB avatar"
                  className="w-16 h-16 rounded-md object-cover"
                />
              </div>
            ) : null}
          </div>

          <Button
            variant="destructive"
            className="mt-4 w-full"
            onClick={() => unlink.mutate({})}
            disabled={unlink?.isPending}
          >
            {unlink?.isPending ? "Unlinking…" : "Unlink GRWB"}
          </Button>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={handleRequestExport}
            disabled={
              sendGRWBInterationMailRequest?.isPending ||
              (exportCooldownUntil && Date.now() < exportCooldownUntil)
            }
          >
            {sendGRWBInterationMailRequest?.isPending
              ? "Requesting"
              : exportCooldownUntil && Date.now() < exportCooldownUntil
                ? `You’ve already requested an export. Try again in ${remainingSeconds}s`
                : "Request Interaction Excel on mail"}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          {step === "init" ? (
            <>
              <Input
                type="email"
                placeholder="GRWB account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                onClick={() => initiate.mutate({ email })}
                disabled={initiate?.isPending || !email}
                className="w-full"
              >
                {initiate?.isPending ? "Sending OTP…" : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button
                onClick={() => verify.mutate({ otp })}
                disabled={verify?.isPending || otp.length !== 6}
                className="w-full"
              >
                {verify?.isPending ? "Verifying…" : "Verify & Link"}
              </Button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
