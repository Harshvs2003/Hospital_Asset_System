import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/dashboard'
import Assets from './pages/Assets'
import AssetDetails from './pages/AssetDetails'
import AddAssets from './pages/AddAssets'
import Complain from './pages/Complain'
import Complaints from './pages/Complaints'
import ComplaintDetails from './pages/ComplaintDetails'
import QRGen from './pages/QRGen'
import Report from './pages/Report'
import Reminders from './pages/Reminders'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import Notifications from './pages/Notifications'
import { useAuth } from './context/AuthContext'
import AuthBoot from './components/AuthBoot'
import './App.css'
import { Menu } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      if (isMobile) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isMobile]);

  useEffect(() => {
    const handler = () => {
      setInstallPromptEvent(null);
      setShowInstallBanner(false);
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  if (isLoading) {
    return <AuthBoot />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {showInstallBanner && installPromptEvent && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Install HealthAsset</div>
              <div className="text-xs text-gray-600">Add this app to your home screen for faster access.</div>
            </div>
            <button
              onClick={async () => {
                try {
                  await installPromptEvent.prompt();
                } catch {
                  // ignore
                } finally {
                  setShowInstallBanner(false);
                }
              }}
              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="rounded-md px-2 py-2 text-gray-500 hover:bg-gray-100"
              aria-label="Close install prompt"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm font-semibold text-gray-900">HealthAsset</div>
          <div className="h-9 w-9" />
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/assets/:assetId" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
          <Route path="/add-assets" element={<ProtectedRoute><AddAssets /></ProtectedRoute>} />
          <Route path="/complain" element={<ProtectedRoute><Complain /></ProtectedRoute>} />
          <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
          <Route path="/complaints/:complaintId" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
          <Route path="/qr-gen" element={<ProtectedRoute><QRGen /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
