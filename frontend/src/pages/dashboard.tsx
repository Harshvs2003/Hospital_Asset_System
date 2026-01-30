// src/pages/Dashboard.tsx
import React, { useState } from "react";
import { BedDouble, Stethoscope, Monitor, Pill } from "lucide-react";

interface StatItem {
  label: string;
  count: number;
}

interface CategoryData {
  name: string;
  icon: React.ElementType;
  total: number;
  stats: StatItem[]; // summary stats (small)
  detailedStats: StatItem[]; // shown on back
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
      detailedStats: [
        { label: "Total", count: 120 },
        { label: "Needs Repair", count: 15 },
        { label: "Complaints (active)", count: 4 },
        { label: "Installed (in wards)", count: 85 },
        { label: "Stored (inventory)", count: 20 },
        { label: "Damaged", count: 6 },
      ],
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
      detailedStats: [
        { label: "Total", count: 85 },
        { label: "Needs Repair", count: 10 },
        { label: "Complaints (active)", count: 7 },
        { label: "Installed (in labs/wards)", count: 60 },
        { label: "Stored (inventory)", count: 15 },
        { label: "Damaged", count: 5 },
      ],
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
      detailedStats: [
        { label: "Total", count: 230 },
        { label: "Needs Repair", count: 8 },
        { label: "Complaints (active)", count: 6 },
        { label: "Installed (in use)", count: 180 },
        { label: "Stored (inventory)", count: 36 },
        { label: "Damaged", count: 6 },
      ],
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
      detailedStats: [
        { label: "Total", count: 600 },
        { label: "Needs Replacement", count: 40 },
        { label: "Complaints (active)", count: 3 },
        { label: "Available (shelves)", count: 520 },
        { label: "Stored (cold/inventory)", count: 57 },
        { label: "Damaged/Expired", count: 23 },
      ],
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

  // Inline styles used to ensure correct 3D behavior without modifying Tailwind config
  const rotatingContainerStyle: React.CSSProperties = {
    transformStyle: "preserve-3d",
    transition: "transform 0.6s",
    perspective: "1000px",
    height: "100%",
    width: "100%",
  };

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
    borderRadius: "1rem",
  };

  const backFacePreRotate: React.CSSProperties = {
    transform: "rotateY(180deg)",
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
      <h1 className="text-3xl font-semibold mb-8 text-gray-800">🏥 Hospital Inventory Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map(({ name, icon: Icon, total, stats, detailedStats }) => {
          const isFlipped = !!flipped[name];
          return (
            <div
              key={name}
              role="button"
              tabIndex={0}
              onClick={() => toggleFlip(name)}
              onKeyDown={(e) => handleKey(e, name)}
              className="relative w-full h-90 cursor-pointer"
              aria-pressed={isFlipped}
              aria-label={`${name} card`}
            >
              {/* Rotating wrapper */}
              <div
                style={{
                  ...rotatingContainerStyle,
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front */}
                <div
                  style={{
                    ...faceStyle,
                    background: "white",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                    color: "#1f2937",
                    zIndex: 2,
                  }}
                  aria-hidden={isFlipped}
                >
                  <Icon className="text-blue-500 mb-3" size={36} />
                  <h2 className="text-lg font-semibold mb-1">{name}</h2>
                  <p className="text-gray-600">Total: {total}</p>

                  {/* small summary */}
                  <div className="mt-3 w-full px-4">
                    <ul className="text-sm text-gray-500 flex justify-between">
                      {stats.map((s) => (
                        <li key={s.label} className="text-center">
                          <div className="font-semibold text-gray-700">{s.count}</div>
                          <div className="text-xs">{s.label}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">(Click to view detailed stats)</p>
                </div>

                {/* Back (pre-rotated so it appears upright after parent rotates) */}
                <div
                  style={{
                    ...faceStyle,
                    ...backFacePreRotate,
                    background: "#2563eb", // Tailwind blue-600
                    color: "white",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    zIndex: 1,
                  }}
                  aria-hidden={!isFlipped}
                >
                  <div className="w-full text-center px-3">
                    <h2 className="text-lg font-semibold mb-1">{name} Details</h2>
                    <p className="text-sm text-white/90 mb-3">Quick breakdown for {name.toLowerCase()}.</p>

                    <div className="w-full bg-white/10 rounded p-3 text-sm">
                      <ul className="space-y-2">
                        {detailedStats.map((d) => (
                          <li key={d.label} className="flex justify-between">
                            <span>{d.label}</span>
                            <span className="font-semibold">{d.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="w-full mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Details clicked for", name);
                      }}
                      className="flex-1 bg-white text-blue-600 rounded px-3 py-2 text-sm font-medium"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Actions clicked for", name);
                      }}
                      className="flex-1 bg-white/20 border border-white text-white rounded px-3 py-2 text-sm"
                    >
                      Actions
                    </button>
                  </div>

                  <p className="text-xs opacity-80 mt-3">(Click to flip back)</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
