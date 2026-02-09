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
  Bell,
  BellRing,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { get } from "../lib/api";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Assets", icon: Package, path: "/assets" },
    { label: "Add Assets", icon: Plus, path: "/add-assets" },
    { label: "Complain", icon: AlertCircle, path: "/complain" },
    { label: "Complaints", icon: ClipboardList, path: "/complaints" },
    { label: "Notifications", icon: Bell, path: "/notifications", badge: unreadCount },
    { label: "QR Generator", icon: QrCode, path: "/qr-gen" },
    ...(user && ["ADMIN", "SUPERVISOR", "VIEWER"].includes(user.role)
      ? [{ label: "Reminders", icon: BellRing, path: "/reminders" }]
      : []),
    { label: "Report", icon: BarChart3, path: "/report" },
  ];

  const isActive = (path: string) => location.pathname === path;

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await get("/notifications/unread-count");
        const count = res?.data?.count ?? res?.count ?? 0;
        if (mounted) setUnreadCount(count);
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const showLabels = isOpen || mobileOpen;
  const widthClass = isOpen ? "md:w-56" : "md:w-20";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col ${widthClass} transform bg-gray-800 text-white shadow-lg transition-all duration-300 ease-in-out md:static md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {showLabels && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">HA</span>
            </div>
            <h1 className="text-lg font-bold">HealthAsset</h1>
          </div>
        )}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition md:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden p-2 hover:bg-gray-700 rounded-lg transition md:inline-flex"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const badge = item.badge ?? 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                active ? "bg-blue-600 text-white shadow-lg" : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              title={!isOpen ? item.label : ""}
              onClick={() => mobileOpen && onClose?.()}
            >
              <div className="relative">
                <Icon size={20} className="shrink-0" />
                {!showLabels && badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
              {showLabels && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4 space-y-3">
        {/* User Info */}
        {user && showLabels && (
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
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
          <LogOut size={20} className="shrink-0" />
          {showLabels && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
