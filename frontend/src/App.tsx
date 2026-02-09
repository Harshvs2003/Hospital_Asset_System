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
import { useAuth } from './context/AuthContext'
import AuthBoot from './components/AuthBoot'
import './App.css'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
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
        <div className="flex-1 overflow-auto">
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
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
