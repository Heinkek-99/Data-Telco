import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  BarChart3,
  Users,
  TrendingDown,
  FileDown,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Reports = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "Rapport Telco Analytics",
    include_sections: ["kpis", "churn", "segments", "trends"],
  });

  const sections = [
    {
      id: "kpis",
      label: "KPIs Principaux",
      description: "Métriques clés du dashboard",
      icon: BarChart3,
    },
    {
      id: "churn",
      label: "Analyse Churn",
      description: "Tendances et raisons de churn",
      icon: TrendingDown,
    },
    {
      id: "segments",
      label: "Segmentation Clients",
      description: "Répartition et caractéristiques",
      icon: Users,
    },
    {
      id: "trends",
      label: "Tendances Mensuelles",
      description: "Évolution sur 12 mois",
      icon: FileText,
    },
  ];

  const handleSectionToggle = (sectionId) => {
    setFormData((prev) => {
      const sections = prev.include_sections.includes(sectionId)
        ? prev.include_sections.filter((s) => s !== sectionId)
        : [...prev.include_sections, sectionId];
      return { ...prev, include_sections: sections };
    });
  };

  const handleGeneratePDF = async () => {
    if (formData.include_sections.length === 0) {
      toast.error("Sélectionnez au moins une section");
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/api/reports/generate-pdf`,
        formData,
        {
          headers,
          responseType: "blob",
          timeout: 60000,
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formData.title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Rapport PDF généré avec succès !");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
          Rapports
        </h1>
        <p className="text-slate-400 mt-1">
          Exportez vos analyses en PDF professionnel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-5 bg-card border border-border/50 rounded-sm p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            Configuration du Rapport
          </h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Titre du Rapport</Label>
              <Input
                type="text"
                placeholder="Mon rapport personnalisé"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="bg-slate-950 border-slate-800 text-white"
                data-testid="report-title-input"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-slate-300">Sections à inclure</Label>
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-start gap-4 p-4 rounded-sm border transition-all cursor-pointer ${
                    formData.include_sections.includes(section.id)
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-slate-900/50 hover:border-border"
                  }`}
                  onClick={() => handleSectionToggle(section.id)}
                  data-testid={`section-${section.id}`}
                >
                  <Checkbox
                    checked={formData.include_sections.includes(section.id)}
                    onCheckedChange={() => handleSectionToggle(section.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <section.icon
                        size={18}
                        className={
                          formData.include_sections.includes(section.id)
                            ? "text-primary"
                            : "text-slate-500"
                        }
                      />
                      <span className="text-white font-medium">
                        {section.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {section.description}
                    </p>
                  </div>
                  {formData.include_sections.includes(section.id) && (
                    <CheckCircle className="text-primary" size={20} />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleGeneratePDF}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3"
              disabled={loading || formData.include_sections.length === 0}
              data-testid="generate-pdf-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Génération en cours...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download size={20} />
                  Générer le PDF
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Preview / Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Preview Card */}
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Aperçu du Rapport
            </h3>
            
            <div className="bg-white rounded-sm p-6 text-black">
              {/* Mock PDF Preview */}
              <div className="space-y-4">
                <div className="h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {formData.title}
                  </span>
                </div>
                
                {formData.include_sections.includes("kpis") && (
                  <div className="border border-gray-200 rounded p-3">
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      KPIs Principaux
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded" />
                      ))}
                    </div>
                  </div>
                )}
                
                {formData.include_sections.includes("segments") && (
                  <div className="border border-gray-200 rounded p-3">
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      Segmentation
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-3 bg-gray-100 rounded"
                            style={{ width: `${100 - i * 20}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.include_sections.includes("churn") && (
                  <div className="border border-gray-200 rounded p-3">
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      Analyse Churn
                    </div>
                    <div className="h-16 bg-gray-100 rounded" />
                  </div>
                )}
                
                {formData.include_sections.includes("trends") && (
                  <div className="border border-gray-200 rounded p-3">
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      Tendances
                    </div>
                    <div className="h-16 bg-gray-100 rounded" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-sm bg-blue-500/20 flex items-center justify-center">
                  <FileDown className="text-blue-400" size={20} />
                </div>
                <h4 className="text-white font-semibold">Format PDF</h4>
              </div>
              <p className="text-slate-400 text-sm">
                Rapport professionnel au format A4, prêt pour l'impression ou le
                partage.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-sm bg-green-500/20 flex items-center justify-center">
                  <BarChart3 className="text-green-400" size={20} />
                </div>
                <h4 className="text-white font-semibold">Graphiques Inclus</h4>
              </div>
              <p className="text-slate-400 text-sm">
                Visualisations exportées en haute qualité avec les données
                actuelles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
