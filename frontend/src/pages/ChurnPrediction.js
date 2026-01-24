import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Lightbulb,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const GaugeChart = ({ score, riskLevel }) => {
  const rotation = (score / 100) * 180;
  const color =
    riskLevel === "Élevé"
      ? "#ef4444"
      : riskLevel === "Moyen"
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Background arc */}
      <div
        className="absolute inset-0 rounded-t-full"
        style={{ background: "#1e293b" }}
      />
      {/* Filled arc */}
      <div
        className="absolute inset-0 rounded-t-full origin-bottom"
        style={{
          background: `conic-gradient(from 180deg, ${color} 0deg, ${color} ${rotation}deg, transparent ${rotation}deg, transparent 180deg)`,
          clipPath: "polygon(0 50%, 100% 50%, 100% 0, 0 0)",
        }}
      />
      {/* Inner circle */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-t-full"
        style={{ background: "#0f172a" }}
      />
      {/* Score text */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-3xl font-mono font-bold text-white">{score}</span>
        <span className="text-slate-400 text-sm">/100</span>
      </div>
    </div>
  );
};

const ChurnPrediction = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [formData, setFormData] = useState({
    tenure: "",
    voice_usage: "",
    data_usage: "",
    complaints: "",
    contract_type: "postpaid",
    monthly_charges: "",
    internet_service: "Fiber optic",
    online_security: "No",
    tech_support: "No",
    streaming_tv: "No",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const headers = getAuthHeaders();
      const payload = {
        ...formData,
        tenure: parseInt(formData.tenure),
        voice_usage: parseFloat(formData.voice_usage),
        data_usage: parseFloat(formData.data_usage),
        complaints: parseInt(formData.complaints),
        monthly_charges: parseFloat(formData.monthly_charges) || 50,
      };

      const response = await axios.post(
        `${API_URL}/api/churn/predict`,
        payload,
        { headers }
      );

      setPrediction(response.data);
      toast.success("Prédiction générée avec succès");
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error("Erreur lors de la prédiction");
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case "Élevé":
        return <AlertTriangle className="text-red-400" size={24} />;
      case "Moyen":
        return <AlertCircle className="text-yellow-400" size={24} />;
      default:
        return <CheckCircle className="text-green-400" size={24} />;
    }
  };

  const getRiskClass = (level) => {
    switch (level) {
      case "Élevé":
        return "risk-high";
      case "Moyen":
        return "risk-medium";
      default:
        return "risk-low";
    }
  };

  return (
    <div className="space-y-8" data-testid="churn-prediction-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
          Churn Prediction
        </h1>
        <p className="text-slate-400 mt-1">
          Prédisez le risque de départ d'un client
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingDown className="text-primary" size={24} />
            Profil Client
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Ancienneté (mois)</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={formData.tenure}
                  onChange={(e) =>
                    setFormData({ ...formData, tenure: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                  data-testid="tenure-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Réclamations</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.complaints}
                  onChange={(e) =>
                    setFormData({ ...formData, complaints: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                  data-testid="complaints-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Conso. Voix (min/mois)</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={formData.voice_usage}
                  onChange={(e) =>
                    setFormData({ ...formData, voice_usage: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                  data-testid="voice-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Conso. Data (GB/mois)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  step="0.1"
                  value={formData.data_usage}
                  onChange={(e) =>
                    setFormData({ ...formData, data_usage: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                  data-testid="data-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Facture Mensuelle (€)</Label>
              <Input
                type="number"
                placeholder="50"
                step="0.01"
                value={formData.monthly_charges}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_charges: e.target.value })
                }
                className="bg-slate-950 border-slate-800 text-white"
                data-testid="charges-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Type de Contrat</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_type: value })
                }
              >
                <SelectTrigger
                  className="bg-slate-950 border-slate-800 text-white"
                  data-testid="contract-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prépayé</SelectItem>
                  <SelectItem value="postpaid">Postpayé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Service Internet</Label>
              <Select
                value={formData.internet_service}
                onValueChange={(value) =>
                  setFormData({ ...formData, internet_service: value })
                }
              >
                <SelectTrigger
                  className="bg-slate-950 border-slate-800 text-white"
                  data-testid="internet-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fiber optic">Fibre optique</SelectItem>
                  <SelectItem value="DSL">DSL</SelectItem>
                  <SelectItem value="No">Aucun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Sécurité Online</Label>
                <Select
                  value={formData.online_security}
                  onValueChange={(value) =>
                    setFormData({ ...formData, online_security: value })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Oui</SelectItem>
                    <SelectItem value="No">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Support Tech</Label>
                <Select
                  value={formData.tech_support}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tech_support: value })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Oui</SelectItem>
                    <SelectItem value="No">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5"
              disabled={loading}
              data-testid="predict-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner w-4 h-4" />
                  Analyse en cours...
                </span>
              ) : (
                "Analyser le Risque"
              )}
            </Button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-6">
          {prediction ? (
            <>
              {/* Risk Score Card */}
              <div className="bg-card border border-border/50 rounded-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    Score de Risque
                  </h3>
                  <div
                    className={`px-4 py-2 rounded-sm flex items-center gap-2 ${getRiskClass(
                      prediction.risk_level
                    )}`}
                    data-testid="risk-level-badge"
                  >
                    {getRiskIcon(prediction.risk_level)}
                    <span className="font-semibold">{prediction.risk_level}</span>
                  </div>
                </div>

                <GaugeChart
                  score={prediction.score}
                  riskLevel={prediction.risk_level}
                />

                <p className="text-center text-slate-400 mt-4">
                  Probabilité de churn:{" "}
                  <span className="text-white font-mono font-bold">
                    {(prediction.probability * 100).toFixed(0)}%
                  </span>
                </p>
              </div>

              {/* Risk Factors */}
              <div className="bg-card border border-border/50 rounded-sm p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Facteurs de Risque
                </h3>
                <div className="space-y-3">
                  {Object.entries(prediction.factors).map(([key, factor]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-sm"
                    >
                      <div>
                        <span className="text-white capitalize">
                          {key.replace("_", " ")}
                        </span>
                        <p className="text-sm text-slate-400">
                          {factor.message}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          factor.impact === "high"
                            ? "bg-red-500/20 text-red-400"
                            : factor.impact === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : factor.impact === "positive"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {factor.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-card border border-border/50 rounded-sm p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="text-yellow-400" size={24} />
                  Recommandations
                </h3>
                <div className="space-y-3">
                  {prediction.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-xs font-bold">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-slate-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border/50 rounded-sm p-12 text-center">
              <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Aucune prédiction
              </h3>
              <p className="text-slate-400">
                Remplissez le formulaire pour analyser le risque de churn d'un
                client
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChurnPrediction;
