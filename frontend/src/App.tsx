import { Routes, Route, Navigate } from 'react-router-dom'
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
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import { useAuth } from './context/AuthContext'
import AuthBoot from './components/AuthBoot'
import './App.css'

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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
    <div className="flex h-screen">
      <Sidebar />
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
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
