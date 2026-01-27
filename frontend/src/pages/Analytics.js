import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { CalendarIcon, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-white font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {entry.name.includes("rate") || entry.name.includes("Rate") || entry.name.includes("Taux") ? "%" : ""}
            {entry.name.includes("Revenu") ? "€" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [overview, setOverview] = useState(null);
  const [filters, setFilters] = useState({
    customerType: "all",
    dateRange: null,
  });
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      const params = {};
      if (filters.customerType !== "all") {
        params.customer_type = filters.customerType;
      }

      const [trendsRes, overviewRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/trends`, { headers }),
        axios.get(`${API_URL}/api/analytics/overview`, { headers, params }),
      ]);

      setTrends(trendsRes.data.trends);
      setOverview(overviewRes.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erreur lors du chargement des analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchAnalyticsData();
    toast.success("Filtres appliqués");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="analytics-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">
            Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            Analyse détaillée des tendances et métriques
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.customerType}
            onValueChange={(value) => handleFilterChange("customerType", value)}
          >
            <SelectTrigger className="w-40 bg-card border-border text-white" data-testid="customer-type-filter">
              <SelectValue placeholder="Type client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-card border-border text-white hover:bg-card/80"
                data-testid="date-range-filter"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange
                  ? format(filters.dateRange, "PPP", { locale: fr })
                  : "Sélectionner une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={filters.dateRange}
                onSelect={(date) => {
                  handleFilterChange("dateRange", date);
                  setDateOpen(false);
                }}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={applyFilters}
            className="bg-primary hover:bg-primary/90"
            data-testid="apply-filters-btn"
          >
            <Filter className="mr-2 h-4 w-4" />
            Appliquer
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setFilters({ customerType: "all", dateRange: null });
              fetchAnalyticsData();
            }}
            className="text-slate-400 hover:text-white"
            data-testid="reset-filters-btn"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Clients Analysés
            </p>
            <p className="text-2xl font-mono font-bold text-white">
              {overview.summary.total_customers.toLocaleString()}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Taux de Churn
            </p>
            <p className="text-2xl font-mono font-bold text-red-400">
              {overview.summary.churn_rate}%
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Ancienneté Moyenne
            </p>
            <p className="text-2xl font-mono font-bold text-white">
              {overview.summary.average_tenure} mois
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Revenu Total
            </p>
            <p className="text-2xl font-mono font-bold text-green-400">
              {(overview.summary.total_revenue / 1000000).toFixed(1)}M€
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Churn Trend */}
        <div className="bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Évolution Mensuelle du Churn
          </h3>
          <div className="h-[300px]" data-testid="monthly-churn-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="churn_rate"
                  name="Taux de Churn"
                  stroke="#ef4444"
                  fill="url(#churnGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New vs Churned Customers */}
        <div className="bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Nouveaux Clients vs Churned
          </h3>
          <div className="h-[300px]" data-testid="customers-comparison-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="new_customers"
                  name="Nouveaux"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="churned_customers"
                  name="Churned"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Évolution des Revenus
          </h3>
          <div className="h-[300px]" data-testid="revenue-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenu"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution Tables */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* By Contract */}
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <h4 className="text-lg font-bold text-white mb-4">Par Contrat</h4>
            <div className="space-y-3">
              {Object.entries(overview.distribution.by_contract).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-slate-400">{key}</span>
                    <span className="text-white font-mono">
                      {value.toLocaleString()}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* By Internet Service */}
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <h4 className="text-lg font-bold text-white mb-4">Par Service Internet</h4>
            <div className="space-y-3">
              {Object.entries(overview.distribution.by_internet_service).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-slate-400">{key}</span>
                    <span className="text-white font-mono">
                      {value.toLocaleString()}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* By Payment Method */}
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <h4 className="text-lg font-bold text-white mb-4">Par Méthode de Paiement</h4>
            <div className="space-y-3">
              {Object.entries(overview.distribution.by_payment_method).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-slate-400 truncate max-w-[150px]">
                      {key}
                    </span>
                    <span className="text-white font-mono">
                      {value.toLocaleString()}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
