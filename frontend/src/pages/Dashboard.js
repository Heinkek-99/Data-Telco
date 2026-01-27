import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  Users,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KPICard = ({ title, value, icon: Icon, change, changeType, color, testId }) => (
  <div className={`kpi-card ${color} card-hover`} data-testid={testId}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
          {title}
        </p>
        <p className="text-3xl font-mono font-bold text-white tracking-tight">
          {value}
        </p>
        {change && (
          <div
            className={`flex items-center gap-1 mt-2 text-xs ${
              changeType === "up" ? "text-green-400" : "text-red-400"
            }`}
          >
            {changeType === "up" ? (
              <ArrowUp size={14} />
            ) : (
              <ArrowDown size={14} />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div
        className={`w-12 h-12 rounded-sm flex items-center justify-center ${
          color === "blue"
            ? "bg-blue-500/20"
            : color === "green"
            ? "bg-green-500/20"
            : color === "red"
            ? "bg-red-500/20"
            : "bg-purple-500/20"
        }`}
      >
        <Icon
          size={24}
          className={
            color === "blue"
              ? "text-blue-400"
              : color === "green"
              ? "text-green-400"
              : color === "red"
              ? "text-red-400"
              : "text-purple-400"
          }
        />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-white font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name.includes("rate") || entry.name.includes("Rate")
              ? "%"
              : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { getAuthHeaders } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [churnTrends, setChurnTrends] = useState([]);
  const [churnReasons, setChurnReasons] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeaders();

      const [kpisRes, trendsRes, reasonsRes, revenueRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/kpis`, { headers }),
        axios.get(`${API_URL}/api/dashboard/churn-trends`, { headers }),
        axios.get(`${API_URL}/api/dashboard/churn-reasons`, { headers }),
        axios.get(`${API_URL}/api/dashboard/revenue-by-segment`, { headers }),
      ]);

      setKpis(kpisRes.data);
      setChurnTrends(trendsRes.data.trends);
      setChurnReasons(reasonsRes.data.reasons);
      setRevenueData(revenueRes.data.revenue);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
          Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Vue d'ensemble de vos métriques télécom
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Clients"
          value={kpis?.total_customers?.toLocaleString() || "0"}
          icon={Users}
          change="+2.5% ce mois"
          changeType="up"
          color="blue"
          testId="kpi-total-customers"
        />
        <KPICard
          title="Taux de Churn"
          value={`${kpis?.churn_rate || 0}%`}
          icon={TrendingDown}
          change="-0.8% ce mois"
          changeType="down"
          color="red"
          testId="kpi-churn-rate"
        />
        <KPICard
          title="ARPU"
          value={`${kpis?.arpu || 0}€`}
          icon={DollarSign}
          change="+1.2% ce mois"
          changeType="up"
          color="green"
          testId="kpi-arpu"
        />
        <KPICard
          title="CLV Moyen"
          value={`${kpis?.clv || 0}€`}
          icon={Activity}
          change="+3.4% ce mois"
          changeType="up"
          color="purple"
          testId="kpi-clv"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Churn Trend Chart */}
        <div className="lg:col-span-8 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Évolution du Churn par Ancienneté
          </h3>
          <div className="h-[300px]" data-testid="churn-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={churnTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="churn_rate"
                  name="Taux de Churn"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb", strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Reasons Pie Chart */}
        <div className="lg:col-span-4 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Principales Raisons de Churn
          </h3>
          <div className="h-[300px]" data-testid="churn-reasons-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={churnReasons.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="percentage"
                  nameKey="reason"
                >
                  {churnReasons.slice(0, 5).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {churnReasons.slice(0, 5).map((reason, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-400 truncate max-w-[150px]">
                    {reason.reason}
                  </span>
                </div>
                <span className="text-white font-mono">
                  {reason.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Segment Bar Chart */}
        <div className="lg:col-span-12 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Revenus par Segment Client
          </h3>
          <div className="h-[300px]" data-testid="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="segment"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenu"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
