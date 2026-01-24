import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, BarChart3, TrendingDown, Users } from "lucide-react";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Connexion réussie !");
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success("Compte créé avec succès !");
      }
      navigate("/");
    } catch (error) {
      const message =
        error.response?.data?.detail || "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: "100K+ Clients", desc: "Analysés en temps réel" },
    { icon: TrendingDown, title: "82% Précision", desc: "Prédiction de churn" },
    { icon: Users, title: "6 Segments", desc: "Profils clients identifiés" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1630806682600-e035310ba8f4?crop=entropy&cs=srgb&fm=jpg&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-primary/20" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            <span className="text-primary">Telco</span>Analytics
            <span className="text-primary">Pro</span>
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-md">
            Dashboard d'analyse client télécom avec prédiction de churn et
            segmentation avancée.
          </p>

          <div className="space-y-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 animate-fadeIn"
                style={{ animationDelay: `${idx * 0.2}s` }}
              >
                <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
                  <feature.icon className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-black text-white mb-2">
              <span className="text-primary">Telco</span>Analytics
            </h1>
            <p className="text-slate-400">Dashboard d'analyse télécom</p>
          </div>

          <div className="glass-card rounded-sm p-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="text-slate-400 mb-8">
              {isLogin
                ? "Accédez à votre tableau de bord"
                : "Rejoignez TelcoAnalytics Pro"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Nom complet
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                    required={!isLogin}
                    data-testid="register-name-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                  required
                  data-testid="email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 pr-10"
                    required
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-sm transition-all active:scale-95"
                disabled={loading}
                data-testid="submit-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner w-4 h-4" />
                    Chargement...
                  </span>
                ) : isLogin ? (
                  "Se connecter"
                ) : (
                  "Créer le compte"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 text-sm transition-colors"
                data-testid="toggle-auth-mode"
              >
                {isLogin
                  ? "Pas de compte ? Créez-en un"
                  : "Déjà un compte ? Connectez-vous"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
