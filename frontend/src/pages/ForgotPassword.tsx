import React from "react";
import { Link } from "react-router-dom";
import { KeyRound, AlertCircle, Loader, Mail } from "lucide-react";
import { post } from "../lib/api";

const ForgotPassword: React.FC = () => {
  const [step, setStep] = React.useState<"request" | "reset">("request");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/auth/forgot-password", { email: email.trim() });
      setMessage("OTP sent to your email.");
      setStep("reset");
      setResendCooldown(60);
    } catch (err: any) {
      const retryAfter =
        err?.response?.data?.retryAfterSeconds ||
        err?.response?.data?.retry_after ||
        null;
      if (retryAfter && Number(retryAfter) > 0) {
        setResendCooldown(Number(retryAfter));
      }
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/auth/forgot-password", { email: email.trim() });
      setMessage("OTP sent to your email.");
      setResendCooldown(60);
    } catch (err: any) {
      const retryAfter =
        err?.response?.data?.retryAfterSeconds ||
        err?.response?.data?.retry_after ||
        null;
      if (retryAfter && Number(retryAfter) > 0) {
        setResendCooldown(Number(retryAfter));
      }
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/auth/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setMessage("Password reset successful. You can now log in.");
      setStep("request");
      setOtp("");
      setNewPassword("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Password reset failed";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <KeyRound className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-600 mt-2">Reset your password via OTP</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            {message}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading || resendCooldown > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Send OTP"}
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="6-digit code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
            <button
              type="button"
              onClick={resendOtp}
              disabled={loading || resendCooldown > 0}
              className="w-full border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-600 text-center mt-6">
          Back to{" "}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
