import React from "react";
import { get } from "../lib/api";
import { User, Mail, CalendarDays, Shield, Building2 } from "lucide-react";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERVISOR" | "VIEWER" | "DEPARTMENT_USER";
  departmentId?: string | null;
  departmentName?: string | null;
  joinedAt?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const roleLabel = (role?: string) => {
  if (!role) return "-";
  if (role === "DEPARTMENT_USER") return "Department";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "ADMIN") return "Admin";
  if (role === "VIEWER") return "Viewer";
  return role;
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await get("/auth/profile");
        if (!mounted) return;
        setProfile(data as ProfileData);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="mt-1 text-sm text-blue-100">Account details and role information.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading profile...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-900">{profile?.name || "-"}</p>
                  <p className="truncate text-sm text-slate-500">{profile?.email || "-"}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Mail size={14} />
                  Email
                </div>
                <div className="text-sm font-medium text-slate-900">{profile?.email || "-"}</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <CalendarDays size={14} />
                  Joined
                </div>
                <div className="text-sm font-medium text-slate-900">{formatDate(profile?.joinedAt)}</div>
              </div>

              {profile?.role === "DEPARTMENT_USER" ? (
                <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <Building2 size={14} />
                    Department
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {profile?.departmentName || "Unknown"} ({profile?.departmentId || "-"})
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <Shield size={14} />
                    Role
                  </div>
                  <div className="text-sm font-medium text-slate-900">{roleLabel(profile?.role)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

