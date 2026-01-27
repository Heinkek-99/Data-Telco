# 📊 Data‑Telco — Customer Analytics Platform

Data‑Telco est une plateforme complète d’analyse client permettant de :
- visualiser des indicateurs clés (KPIs),
- analyser le churn,
- segmenter les clients,
- générer des rapports,
- explorer les données via une interface moderne.

Le projet est composé de deux parties :
- **Backend API** : FastAPI + MongoDB (Render)
- **Frontend Web App** : React + Craco (Vercel)

---

## 🚀 Démo

- **Frontend (Vercel)** : https://telco-analysis.vercel.app  
- **Backend API (Render)** : https://data-telco-api.onrender.com

---

## 🏗️ Architecture

Data-Telco/
│
├── Backend/               # API FastAPI
│   ├── server.py
│   ├── routers/
│   ├── models/
│   ├── services/
│   ├── utils/
│   ├── requirements.txt
│   └── ...
│
└── frontend/              # Application React
├── src/
├── public/
├── package.json
└── ...


---

# 🧠 Fonctionnalités

### 🔐 Authentification
- Login / Register
- JWT Tokens
- Protection des routes API

### 📊 Dashboard
- KPIs globaux
- Graphiques (Recharts / Matplotlib)
- Analyse du churn

### 🧩 Segmentation
- Segments clients
- Visualisation des groupes
- Export PDF

### 📈 Analytics
- Statistiques détaillées
- Filtres dynamiques
- Requêtes API optimisées

---

# ⚙️ Backend — FastAPI

## 📦 Installation

```bash
cd Backend
pip install -r requirements.txt

```bash
uvicorn server:app --reload

