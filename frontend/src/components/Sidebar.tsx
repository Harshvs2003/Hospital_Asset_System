import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Package,
  Plus,
  AlertCircle,
  ClipboardList,
  QrCode,
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Assets", icon: Package, path: "/assets" },
    { label: "Add Assets", icon: Plus, path: "/add-assets" },
    { label: "Complain", icon: AlertCircle, path: "/complain" },
    { label: "Complaints", icon: ClipboardList, path: "/complaints" },
    { label: "QR Generator", icon: QrCode, path: "/qr-gen" },
    { label: "Report", icon: BarChart3, path: "/report" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside
      className={`${isOpen ? "w-64" : "w-20"} bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col shadow-lg`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">HA</span>
            </div>
            <h1 className="text-lg font-bold">HealthAsset</h1>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-700 rounded-lg transition">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                active ? "bg-blue-600 text-white shadow-lg" : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              title={!isOpen ? item.label : ""}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4 space-y-3">
        {/* User Info */}
        {user && isOpen && (
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
          title="Logout"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
