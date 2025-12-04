// src/pages/Dashboard.tsx
import React, { useState } from "react";
import { BedDouble, Stethoscope, Monitor, Pill } from "lucide-react";

interface CategoryData {
  name: string;
  icon: React.ElementType;
  total: number;
  stats: { label: string; count: number }[];
  backInfo?: string;
}

const Dashboard: React.FC = () => {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const categories: CategoryData[] = [
    {
      name: "Beds",
      icon: BedDouble,
      total: 120,
      stats: [
        { label: "Available", count: 90 },
        { label: "Under Repair", count: 15 },
        { label: "Occupied", count: 15 },
      ],
      backInfo: "This card shows bed-level operations and quick actions.",
    },
    {
      name: "Machines",
      icon: Monitor,
      total: 85,
      stats: [
        { label: "Working", count: 70 },
        { label: "Under Maintenance", count: 10 },
        { label: "Damaged", count: 5 },
      ],
      backInfo: "Machine details and maintenance schedules appear here.",
    },
    {
      name: "Medical Tools",
      icon: Stethoscope,
      total: 230,
      stats: [
        { label: "Available", count: 200 },
        { label: "Missing", count: 10 },
        { label: "Sterilizing", count: 20 },
      ],
      backInfo: "Tools inventory and sterilization status.",
    },
    {
      name: "Medicines",
      icon: Pill,
      total: 600,
      stats: [
        { label: "In Stock", count: 550 },
        { label: "Expiring Soon", count: 25 },
        { label: "Out of Stock", count: 25 },
      ],
      backInfo: "Medicine batches, expiry alerts and reorder links.",
    },
  ];

  const toggleFlip = (name: string) => {
    setFlipped((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleKey = (e: React.KeyboardEvent, name: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFlip(name);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
      <h1 className="text-3xl font-semibold mb-8 text-gray-800">🏥 Hospital Inventory Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map(({ name, icon: Icon, total, stats, backInfo }) => (
          <div
            key={name}
            role="button"
            tabIndex={0}
            onClick={() => toggleFlip(name)}
            onKeyDown={(e) => handleKey(e, name)}
            className="relative w-full h-48 cursor-pointer"
            aria-pressed={!!flipped[name]}
            aria-label={`${name} card`}
          >
            <div className={`relative w-full h-full transition-transform duration-500 ${flipped[name] ? "transform rotate-y-180" : ""}`}>
              {/* Front Side */}
              <div className={`absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg flex flex-col justify-center items-center hover:shadow-xl transition p-4`}>
                <Icon className="text-blue-500 mb-3" size={36} />
                <h2 className="text-lg font-semibold text-gray-700 mb-1">{name}</h2>
                <p className="text-gray-600">Total: {total}</p>
                <p className="text-xs text-gray-400 mt-2">(Click to view details)</p>
              </div>

              {/* Back Side */}
              <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 text-white rounded-2xl shadow-lg flex flex-col justify-center items-center px-4`}>
                <h2 className="text-lg font-semibold mb-2">{name} Overview</h2>
                <p className="text-sm text-white/90 text-center mb-3">{backInfo}</p>
                <div className="w-full">
                  <h3 className="text-sm font-medium mb-1">Quick Stats</h3>
                  <ul className="text-sm space-y-1 mb-3">
                    {stats.map((s) => (
                      <li key={s.label} className="flex justify-between">
                        <span>{s.label}</span>
                        <span className="font-semibold">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-white text-blue-600 rounded px-3 py-1 text-sm font-medium">Details</button>
                    <button className="flex-1 bg-white/20 border border-white text-white rounded px-3 py-1 text-sm">Actions</button>
                  </div>
                </div>
                <p className="text-xs opacity-80 mt-3">(Click to flip back)</p>
              </div>
            </div>

            {/* Small CSS fallback for 3D flip using inline style classes (Tailwind doesn't ship rotate-y by default).
                If you want a perfect 3D flip, add the following CSS to your global stylesheet:
                .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .transform.rotate-y-180 { transform: rotateY(180deg); }
            */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
