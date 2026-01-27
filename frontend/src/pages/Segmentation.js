import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Users, ChevronRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SEGMENT_COLORS = {
  "Premium Users": "#2563eb",
  "Heavy Data Users": "#10b981",
  "Voice Only": "#f59e0b",
  "Low ARPU": "#8b5cf6",
  "At-Risk": "#ef4444",
  "Loyal Base": "#06b6d4",
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="text-white font-semibold">{data.name}</p>
        <p className="text-slate-400">
          {data.count.toLocaleString()} clients ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const SegmentCard = ({ segment, isSelected, onClick }) => (
  <div
    className={`bg-card border rounded-sm p-5 cursor-pointer transition-all duration-300 ${
      isSelected
        ? "border-primary shadow-lg shadow-primary/20"
        : "border-border/50 hover:border-primary/50"
    }`}
    onClick={onClick}
    data-testid={`segment-card-${segment.name.toLowerCase().replace(/\s/g, "-")}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: segment.color }}
        />
        <h4 className="text-white font-semibold">{segment.name}</h4>
      </div>
      <ChevronRight
        className={`text-slate-500 transition-transform ${
          isSelected ? "rotate-90" : ""
        }`}
        size={20}
      />
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-3xl font-mono font-bold text-white">
          {segment.percentage}%
        </p>
        <p className="text-sm text-slate-500">
          {segment.count.toLocaleString()} clients
        </p>
      </div>
      <div
        className="w-16 h-16 rounded-sm flex items-center justify-center"
        style={{ backgroundColor: `${segment.color}20` }}
      >
        <Users style={{ color: segment.color }} size={28} />
      </div>
    </div>
  </div>
);

const Segmentation = () => {
  const { getAuthHeaders } = useAuth();
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSegments = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/segments`, { headers });
      setSegments(response.data);
      if (response.data.length > 0) {
        setSelectedSegment(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching segments:", error);
      toast.error("Erreur lors du chargement des segments");
    } finally {
      setLoading(false);
    }
  };

  const chartData = segments.map((seg) => ({
    name: seg.name,
    value: seg.percentage,
    count: seg.count,
    percentage: seg.percentage,
    color: seg.color,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="segmentation-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
          Segmentation Clients
        </h1>
        <p className="text-slate-400 mt-1">
          Analyse des 6 profils types de votre base clients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart */}
        <div className="lg:col-span-5 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Répartition des Segments
          </h3>
          <div className="h-[400px]" data-testid="segments-pie-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  onClick={(data) => {
                    const segment = segments.find((s) => s.name === data.name);
                    if (segment) setSelectedSegment(segment);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={
                        selectedSegment?.name === entry.name
                          ? "#fff"
                          : "transparent"
                      }
                      strokeWidth={selectedSegment?.name === entry.name ? 3 : 0}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {segments.map((segment) => (
              <div
                key={segment.name}
                className={`flex items-center gap-2 p-2 rounded-sm cursor-pointer transition-all ${
                  selectedSegment?.name === segment.name
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
                onClick={() => setSelectedSegment(segment)}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-slate-300 truncate">
                  {segment.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Segment Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map((segment) => (
              <SegmentCard
                key={segment.name}
                segment={segment}
                isSelected={selectedSegment?.name === segment.name}
                onClick={() => setSelectedSegment(segment)}
              />
            ))}
          </div>

          {/* Selected Segment Details */}
          {selectedSegment && (
            <div className="bg-card border border-border/50 rounded-sm p-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedSegment.color }}
                />
                <h3 className="text-xl font-bold text-white">
                  {selectedSegment.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Characteristics */}
                <div>
                  <h4 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">
                    Caractéristiques
                  </h4>
                  <ul className="space-y-2">
                    {selectedSegment.characteristics.map((char, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-slate-300"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: selectedSegment.color }}
                        />
                        {char}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">
                    Actions Recommandées
                  </h4>
                  <ul className="space-y-2">
                    {selectedSegment.actions.map((action, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/20 rounded-sm"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-primary text-xs font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-slate-300">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Segmentation;
