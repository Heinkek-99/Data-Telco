#!/usr/bin/env python3

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from starlette.middleware.cors import CORSMiddleware

matplotlib.use("Agg")


# PDF Generation using reportlab

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# CSV data cache
telco_data = None


# ============== LIFESPAN ==============


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    # Startup
    logger.info("Starting Telco Analytics API...")
    try:
        await load_telco_data()
        logger.info("Data loaded successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

    yield

    # Shutdown
    logger.info("Shutting down...")
    client.close()


# ============== APP CREATION ==============

# Create the main app
app = FastAPI(
    title="Telco Customer Analytics API",
    description="API pour l'analyse et la prédiction du churn des clients.",
    version="1.0.0",
    lifespan=lifespan,
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)


# ============== MODELS ==============


class UserCreate(BaseModel):
    email: str
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    token: str


class ChurnPredictionRequest(BaseModel):
    tenure: int = Field(..., description="Ancienneté en mois")
    voice_usage: float = Field(..., description="Consommation voix (min/mois)")
    data_usage: float = Field(..., description="Consommation data (GB/mois)")
    complaints: int = Field(..., description="Nombre de réclamations")
    contract_type: str = Field(..., description="Type de contrat: prepaid/postpaid")
    monthly_charges: Optional[float] = 50.0
    internet_service: Optional[str] = "Fiber optic"
    online_security: Optional[str] = "No"
    tech_support: Optional[str] = "No"
    streaming_tv: Optional[str] = "No"


class ChurnPredictionResponse(BaseModel):
    risk_level: str
    probability: float
    score: int
    recommendations: List[str]
    factors: Dict[str, Any]


class KPIResponse(BaseModel):
    total_customers: int
    churn_rate: float
    arpu: float
    clv: float
    churn_count: int
    active_customers: int


class SegmentInfo(BaseModel):
    name: str
    percentage: float
    count: int
    characteristics: List[str]
    actions: List[str]
    color: str


class ReportRequest(BaseModel):
    title: str = "Rapport Telco Analytics"
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    include_sections: List[str] = ["kpis", "churn", "segments", "trends"]


# ============== AUTH HELPERS ==============


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============== DATA LOADING ==============


async def load_telco_data():
    global telco_data
    if telco_data is not None:
        return telco_data

    # Check if data exists in MongoDB
    try:
        count = await db.customers.count_documents({})
        if count > 0:
            cursor = db.customers.find({}, {"_id": 0})
            data = await cursor.to_list(length=10000)
            telco_data = pd.DataFrame(data)
            logger.info(f"Loaded {len(telco_data)} records from MongoDB")
            return telco_data
    except Exception as e:
        logger.error(f"Error loading data from MongoDB: {e}")

    # Load from CSV URL
    try:
        csv_url = "../data/Telco-Customer-Churn.csv"
        telco_data = pd.read_csv(csv_url)

        # Clean data
        telco_data["TotalCharges"] = pd.to_numeric(
            telco_data["TotalCharges"], errors="coerce"
        )
        telco_data["TotalCharges"].fillna(0, inplace=True)
        telco_data["Churn"] = telco_data["Churn"].map({"Yes": 1, "No": 0})

        logger.info(f"Loaded {len(telco_data)} customer records from CSV")

        # Store in MongoDB
        try:
            records = telco_data.to_dict("records")
            if records:
                await db.customers.delete_many({})
                await db.customers.insert_many(records)
                logger.info(f"Data stored in MongoDB, {len(telco_data)} records")
        except Exception as e:
            logger.error(f"Error storing data in MongoDB: {e}")

        return telco_data
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return None


def create_sample_data():
    np.random.seed(42)
    n = 7043

    data = {
        "customerID": [f"CUST-{i:05d}" for i in range(n)],
        "gender": np.random.choice(["Male", "Female"], n),
        "SeniorCitizen": np.random.choice([0, 1], n, p=[0.84, 0.16]),
        "Partner": np.random.choice(["Yes", "No"], n),
        "Dependents": np.random.choice(["Yes", "No"], n),
        "tenure": np.random.randint(0, 73, n),
        "PhoneService": np.random.choice(["Yes", "No"], n, p=[0.9, 0.1]),
        "MultipleLines": np.random.choice(["Yes", "No", "No phone service"], n),
        "InternetService": np.random.choice(
            ["DSL", "Fiber optic", "No"], n, p=[0.34, 0.44, 0.22]
        ),
        "OnlineSecurity": np.random.choice(["Yes", "No", "No internet service"], n),
        "OnlineBackup": np.random.choice(["Yes", "No", "No internet service"], n),
        "DeviceProtection": np.random.choice(["Yes", "No", "No internet service"], n),
        "TechSupport": np.random.choice(["Yes", "No", "No internet service"], n),
        "StreamingTV": np.random.choice(["Yes", "No", "No internet service"], n),
        "StreamingMovies": np.random.choice(["Yes", "No", "No internet service"], n),
        "Contract": np.random.choice(
            ["Month-to-month", "One year", "Two year"], n, p=[0.55, 0.21, 0.24]
        ),
        "PaperlessBilling": np.random.choice(["Yes", "No"], n),
        "PaymentMethod": np.random.choice(
            [
                "Electronic check",
                "Mailed check",
                "Bank transfer (automatic)",
                "Credit card (automatic)",
            ],
            n,
        ),
        "MonthlyCharges": np.random.uniform(18, 120, n),
        "TotalCharges": np.random.uniform(20, 8700, n),
        "Churn": np.random.choice([0, 1], n, p=[0.73, 0.27]),
    }

    return pd.DataFrame(data)


# ============== AUTH ENDPOINTS ==============


@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user.password)

    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hashed_pw,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.users.insert_one(user_doc)
    token = create_token(user_id, user.email)

    return UserResponse(id=user_id, email=user.email, name=user.name, token=token)


@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(user["id"], user["email"])
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"], token=token
    )


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one(
        {"id": current_user["user_id"]}, {"_id": 0, "password": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user


# ============== DASHBOARD ENDPOINTS ==============


@api_router.get("/dashboard/kpis", response_model=KPIResponse)
async def get_kpis(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()

    total_customers = len(df)
    churn_count = int(df["Churn"].sum())
    churn_rate = round((churn_count / total_customers) * 100, 2)
    arpu = round(df["MonthlyCharges"].mean(), 2)
    clv = round(df["TotalCharges"].mean(), 2)
    active_customers = total_customers - churn_count

    return KPIResponse(
        total_customers=total_customers,
        churn_rate=churn_rate,
        arpu=arpu,
        clv=clv,
        churn_count=churn_count,
        active_customers=active_customers,
    )


@api_router.get("/dashboard/churn-trends")
async def get_churn_trends(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()

    # Churn by tenure buckets (simulating monthly data)
    df["tenure_bucket"] = pd.cut(
        df["tenure"],
        bins=[0, 6, 12, 24, 36, 48, 60, 72],
        labels=["0-6", "7-12", "13-24", "25-36", "37-48", "49-60", "61-72"],
    )

    churn_by_tenure = (
        df.groupby("tenure_bucket", observed=True)
        .agg({"Churn": "mean", "customerID": "count"})
        .reset_index()
    )

    trends = []
    for _, row in churn_by_tenure.iterrows():
        trends.append(
            {
                "month": str(row["tenure_bucket"]),
                "churn_rate": round(row["Churn"] * 100, 2),
                "customers": int(row["customerID"]),
            }
        )

    return {"trends": trends}


@api_router.get("/dashboard/churn-reasons")
async def get_churn_reasons(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()
    churned = df[df["Churn"] == 1]

    # Analyze churn reasons based on service attributes
    reasons = []

    # Contract type
    contract_churn = churned["Contract"].value_counts(normalize=True) * 100
    for contract, pct in contract_churn.items():
        reasons.append(
            {
                "reason": f"Contrat {contract}",
                "percentage": round(pct, 1),
                "category": "Contract",
            }
        )

    # Internet Service
    internet_churn = churned["InternetService"].value_counts(normalize=True) * 100
    for service, pct in internet_churn.items():
        if service != "No":
            reasons.append(
                {
                    "reason": f"Internet {service}",
                    "percentage": round(pct, 1),
                    "category": "Service",
                }
            )

    # Sort by percentage and take top 10
    reasons = sorted(reasons, key=lambda x: x["percentage"], reverse=True)[:10]

    return {"reasons": reasons}


@api_router.get("/dashboard/revenue-by-segment")
async def get_revenue_by_segment(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()

    # Create segments based on ARPU
    df["segment"] = pd.cut(
        df["MonthlyCharges"],
        bins=[0, 30, 50, 70, 90, 120],
        labels=["Basic", "Standard", "Plus", "Premium", "Enterprise"],
    )

    revenue = (
        df.groupby("segment", observed=True)
        .agg({"TotalCharges": "sum", "customerID": "count"})
        .reset_index()
    )

    result = []
    for _, row in revenue.iterrows():
        result.append(
            {
                "segment": str(row["segment"]),
                "revenue": round(row["TotalCharges"], 2),
                "customers": int(row["customerID"]),
            }
        )

    return {"revenue": result}


@api_router.get("/dashboard/retention-by-offer")
async def get_retention_by_offer(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()

    retention = (
        df.groupby("Contract")
        .agg({"Churn": lambda x: (1 - x.mean()) * 100, "customerID": "count"})
        .reset_index()
    )

    result = []
    for _, row in retention.iterrows():
        result.append(
            {
                "offer": row["Contract"],
                "retention_rate": round(row["Churn"], 2),
                "customers": int(row["customerID"]),
            }
        )

    return {"retention": result}


# ============== CHURN PREDICTION ==============


@api_router.post("/churn/predict", response_model=ChurnPredictionResponse)
async def predict_churn(
    request: ChurnPredictionRequest, current_user: dict = Depends(get_current_user)
):
    # Business rules for churn prediction
    score = 0
    factors = {}

    # Tenure factor (lower tenure = higher risk)
    if request.tenure < 6:
        score += 30
        factors["tenure"] = {
            "value": request.tenure,
            "impact": "high",
            "message": "Client nouveau (< 6 mois)",
        }
    elif request.tenure < 12:
        score += 20
        factors["tenure"] = {
            "value": request.tenure,
            "impact": "medium",
            "message": "Client récent (6-12 mois)",
        }
    elif request.tenure < 24:
        score += 10
        factors["tenure"] = {
            "value": request.tenure,
            "impact": "low",
            "message": "Client établi (1-2 ans)",
        }
    else:
        factors["tenure"] = {
            "value": request.tenure,
            "impact": "positive",
            "message": "Client fidèle (> 2 ans)",
        }

    # Complaints factor
    if request.complaints >= 3:
        score += 25
        factors["complaints"] = {
            "value": request.complaints,
            "impact": "high",
            "message": "Nombreuses réclamations",
        }
    elif request.complaints >= 1:
        score += 15
        factors["complaints"] = {
            "value": request.complaints,
            "impact": "medium",
            "message": "Quelques réclamations",
        }
    else:
        factors["complaints"] = {
            "value": request.complaints,
            "impact": "positive",
            "message": "Aucune réclamation",
        }

    # Contract type
    if request.contract_type.lower() == "prepaid":
        score += 20
        factors["contract"] = {
            "value": request.contract_type,
            "impact": "high",
            "message": "Contrat prépayé (sans engagement)",
        }
    else:
        score += 5
        factors["contract"] = {
            "value": request.contract_type,
            "impact": "low",
            "message": "Contrat postpayé",
        }

    # Monthly charges
    if request.monthly_charges > 80:
        score += 10
        factors["charges"] = {
            "value": request.monthly_charges,
            "impact": "medium",
            "message": "Facture élevée",
        }

    # Data usage (low usage = higher risk)
    if request.data_usage is not None and request.data_usage < 2:
        score += 15
        factors["data_usage"] = {
            "value": request.data_usage,
            "impact": "medium",
            "message": "Faible consommation data",
        }

    # Internet service
    if request.internet_service == "Fiber optic":
        score += 10
        factors["internet"] = {
            "value": request.internet_service,
            "impact": "medium",
            "message": "Fibre optique (plus volatile)",
        }

    # Security services
    if request.online_security == "No" and request.tech_support == "No":
        score += 10
        factors["services"] = {
            "value": "Aucun service additionnel",
            "impact": "medium",
            "message": "Pas de services de sécurité",
        }

    # Cap score at 100
    score = min(score, 100)
    probability = score / 100

    # Determine risk level
    if score >= 70:
        risk_level = "Élevé"
    elif score >= 40:
        risk_level = "Moyen"
    else:
        risk_level = "Faible"

    # Generate recommendations
    recommendations = []
    if factors.get("tenure", {}).get("impact") in ["high", "medium"]:
        recommendations.append(
            "Programme d'onboarding personnalisé pour les nouveaux clients"
        )
    if factors.get("complaints", {}).get("impact") in ["high", "medium"]:
        recommendations.append(
            "Contacter le client pour résoudre les problèmes signalés"
        )
    if factors.get("contract", {}).get("impact") == "high":
        recommendations.append("Proposer une offre d'engagement avec avantages")
    if factors.get("charges", {}).get("impact") == "medium":
        recommendations.append("Offrir une réduction ou un upgrade de services")
    if factors.get("data_usage", {}).get("impact") == "medium":
        recommendations.append("Proposer des forfaits adaptés à l'usage")
    if factors.get("services", {}).get("impact") == "medium":
        recommendations.append("Offrir un essai gratuit des services premium")

    if not recommendations:
        recommendations.append(
            "Maintenir la relation client avec des communications régulières"
        )
        recommendations.append("Proposer le programme de fidélité")

    return ChurnPredictionResponse(
        risk_level=risk_level,
        probability=round(probability, 2),
        score=score,
        recommendations=recommendations,
        factors=factors,
    )


# ============== SEGMENTATION ==============


@api_router.get("/segments", response_model=List[SegmentInfo])
async def get_segments(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()
    total = len(df)

    # Define segments based on data analysis
    segments = []

    # Premium Users (high ARPU, long tenure)
    premium = df[(df["MonthlyCharges"] > 90) & (df["tenure"] > 24)]
    segments.append(
        SegmentInfo(
            name="Premium Users",
            percentage=round(len(premium) / total * 100, 1),
            count=len(premium),
            characteristics=[
                "ARPU > 90€",
                "Ancienneté > 24 mois",
                "Services multiples",
                "Faible taux de churn",
            ],
            actions=[
                "Programme VIP exclusif",
                "Offres early access",
                "Support prioritaire",
            ],
            color="#2563eb",
        )
    )

    # Heavy Data Users
    heavy_data = df[df["InternetService"] == "Fiber optic"]
    segments.append(
        SegmentInfo(
            name="Heavy Data Users",
            percentage=round(len(heavy_data) / total * 100, 1),
            count=len(heavy_data),
            characteristics=[
                "Abonnement Fibre",
                "Streaming actif",
                "Usage data élevé",
                "Sensible à la vitesse",
            ],
            actions=[
                "Upgrade vers fibre premium",
                "Bundle streaming",
                "Garantie de débit",
            ],
            color="#10b981",
        )
    )

    # Voice Only
    voice_only = df[(df["InternetService"] == "No") & (df["PhoneService"] == "Yes")]
    segments.append(
        SegmentInfo(
            name="Voice Only",
            percentage=round(len(voice_only) / total * 100, 1),
            count=len(voice_only),
            characteristics=[
                "Téléphone uniquement",
                "Pas d'internet",
                "Usage traditionnel",
                "Profil senior",
            ],
            actions=[
                "Offre internet simplifiée",
                "Formation digitale",
                "Tarifs voix avantageux",
            ],
            color="#f59e0b",
        )
    )

    # Low ARPU
    low_arpu = df[df["MonthlyCharges"] < 40]
    segments.append(
        SegmentInfo(
            name="Low ARPU",
            percentage=round(len(low_arpu) / total * 100, 1),
            count=len(low_arpu),
            characteristics=[
                "ARPU < 40€",
                "Services basiques",
                "Sensible au prix",
                "Potentiel d'upsell",
            ],
            actions=[
                "Offres bundle attractives",
                "Promotions ciblées",
                "Montée en gamme progressive",
            ],
            color="#8b5cf6",
        )
    )

    # At-Risk
    at_risk = df[(df["Contract"] == "Month-to-month") & (df["tenure"] < 12)]
    segments.append(
        SegmentInfo(
            name="At-Risk",
            percentage=round(len(at_risk) / total * 100, 1),
            count=len(at_risk),
            characteristics=[
                "Contrat mensuel",
                "Ancienneté < 12 mois",
                "Pas d'engagement",
                "Risque de churn élevé",
            ],
            actions=[
                "Programme de rétention",
                "Offre d'engagement",
                "Appel proactif",
                "Remise fidélité",
            ],
            color="#ef4444",
        )
    )

    # Loyal Base
    loyal = df[(df["Contract"].isin(["One year", "Two year"])) & (df["tenure"] > 36)]
    segments.append(
        SegmentInfo(
            name="Loyal Base",
            percentage=round(len(loyal) / total * 100, 1),
            count=len(loyal),
            characteristics=[
                "Contrat long terme",
                "Ancienneté > 3 ans",
                "Faible churn",
                "Ambassadeurs potentiels",
            ],
            actions=[
                "Programme parrainage",
                "Récompenses fidélité",
                "Renouvellement anticipé",
            ],
            color="#06b6d4",
        )
    )

    return segments


# ============== ANALYTICS ==============


@api_router.get("/analytics/overview")
async def get_analytics_overview(
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    region: Optional[str] = None,
    customer_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    df = await load_telco_data()

    # Apply filters if provided
    filtered_df = df.copy()
    if customer_type:
        if customer_type == "churned":
            filtered_df = filtered_df[filtered_df["Churn"] == 1]
        elif customer_type == "active":
            filtered_df = filtered_df[filtered_df["Churn"] == 0]

    # Calculate metrics
    total = len(filtered_df)
    churned = filtered_df["Churn"].sum()

    return {
        "summary": {
            "total_customers": total,
            "churned_customers": int(churned),
            "active_customers": int(total - churned),
            "churn_rate": round((churned / total) * 100, 2) if total > 0 else 0,
            "average_tenure": round(filtered_df["tenure"].mean(), 1),
            "average_monthly_charges": round(filtered_df["MonthlyCharges"].mean(), 2),
            "total_revenue": round(filtered_df["TotalCharges"].sum(), 2),
        },
        "distribution": {
            "by_contract": filtered_df["Contract"].value_counts().to_dict(),
            "by_internet_service": filtered_df["InternetService"]
            .value_counts()
            .to_dict(),
            "by_payment_method": filtered_df["PaymentMethod"].value_counts().to_dict(),
        },
    }


@api_router.get("/analytics/trends")
async def get_analytics_trends(current_user: dict = Depends(get_current_user)):
    df = await load_telco_data()

    # Simulate monthly trends (using tenure as proxy)
    months = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Jun",
        "Jul",
        "Aoû",
        "Sep",
        "Oct",
        "Nov",
        "Déc",
    ]

    # Generate realistic trend data
    base_churn = df["Churn"].mean() * 100
    trends = []

    for i, month in enumerate(months):
        variation = np.random.uniform(-3, 3)
        trends.append(
            {
                "month": month,
                "churn_rate": round(base_churn + variation + (i * 0.2), 2),
                "new_customers": int(np.random.randint(400, 700)),
                "churned_customers": int(np.random.randint(100, 250)),
                "revenue": round(np.random.uniform(280000, 350000), 2),
            }
        )

    return {"trends": trends}


# ============== PDF REPORTS ==============


@api_router.post("/reports/generate-pdf")
async def generate_pdf_report(
    request: ReportRequest, current_user: dict = Depends(get_current_user)
):
    try:
        df = await load_telco_data()

        # Calculate KPIs
        total_customers = len(df)
        churn_rate = round((df["Churn"].sum() / total_customers) * 100, 2)
        arpu = round(df["MonthlyCharges"].mean(), 2)
        clv = round(df["TotalCharges"].mean(), 2)

        # Generate charts as images
        chart_files = {}

        # Segment pie chart
        plt.style.use("default")
        fig, ax = plt.subplots(figsize=(6, 6), dpi=100)
        segment_labels = [
            "Premium",
            "Heavy Data",
            "Voice Only",
            "Low ARPU",
            "At-Risk",
            "Loyal",
        ]
        segment_values = [15, 22, 18, 20, 13, 12]
        colors_pie = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"]
        ax.pie(
            segment_values, labels=segment_labels, autopct="%1.1f%%", colors=colors_pie
        )
        ax.set_title("Répartition des Segments Clients", fontsize=14, fontweight="bold")
        segment_buf = BytesIO()
        fig.savefig(segment_buf, format="png", bbox_inches="tight", dpi=100)
        segment_buf.seek(0)
        chart_files["segments"] = segment_buf
        plt.close(fig)

        # Churn trend line chart
        fig, ax = plt.subplots(figsize=(8, 4), dpi=100)
        months = [
            "Jan",
            "Fév",
            "Mar",
            "Avr",
            "Mai",
            "Jun",
            "Jul",
            "Aoû",
            "Sep",
            "Oct",
            "Nov",
            "Déc",
        ]
        churn_values = [
            18.5,
            17.8,
            19.2,
            18.1,
            17.5,
            18.8,
            19.5,
            18.3,
            17.9,
            18.6,
            19.1,
            18.3,
        ]
        ax.plot(months, churn_values, marker="o", color="#2563eb", linewidth=2)
        ax.fill_between(months, churn_values, alpha=0.3, color="#2563eb")
        ax.set_title(
            "Évolution du Taux de Churn sur 12 Mois", fontsize=14, fontweight="bold"
        )
        ax.set_ylabel("Taux de Churn (%)")
        ax.grid(True, alpha=0.3)
        churn_buf = BytesIO()
        fig.savefig(churn_buf, format="png", bbox_inches="tight", dpi=100)
        churn_buf.seek(0)
        chart_files["churn_trend"] = churn_buf
        plt.close(fig)

        # Contract distribution bar chart
        fig, ax = plt.subplots(figsize=(8, 4), dpi=100)
        contract_counts = df["Contract"].value_counts()
        ax.bar(
            list(contract_counts.index), list(contract_counts.values), color="#2563eb"
        )
        ax.set_title("Distribution par Type de Contrat", fontsize=14, fontweight="bold")
        ax.set_ylabel("Nombre de Clients")
        contract_buf = BytesIO()
        fig.savefig(contract_buf, format="png", bbox_inches="tight", dpi=100)
        contract_buf.seek(0)
        chart_files["contracts"] = contract_buf
        plt.close(fig)

        # Create PDF using reportlab
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        # Créer styles personnalisés
        getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="CustomTitle",
            fontSize=24,
            textColor=colors.HexColor("#2563eb"),
            alignment=TA_CENTER,
            spaceAfter=20,
            fontName="Helvetica-Bold",
        )

        subtitle_style = ParagraphStyle(
            name="CustomSubtitle",
            fontSize=12,
            textColor=colors.HexColor("#64748b"),
            alignment=TA_CENTER,
            spaceAfter=30,
        )

        section_title_style = ParagraphStyle(
            name="CustomSectionTitle",
            fontSize=16,
            textColor=colors.HexColor("#2563eb"),
            spaceAfter=15,
            spaceBefore=20,
            fontName="Helvetica-Bold",
        )

        body_text_style = ParagraphStyle(
            name="CustomBodyText",
            fontSize=11,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=10,
            leading=16,
        )

        elements = []

        # Title
        elements.append(Paragraph(request.title, title_style))
        date_str = datetime.now().strftime("%d/%m/%Y à %H:%M")
        elements.append(Paragraph(f"Généré le {date_str}", subtitle_style))
        elements.append(Spacer(1, 20))

        # Executive Summary
        elements.append(Paragraph("Résumé Exécutif", section_title_style))
        summary_text = (
            f"Ce rapport présente une analyse complète de la base clients "
            f"télécom avec <b>{total_customers:,}</b> clients. "
            f"Le taux de churn actuel est de <b>{churn_rate}%</b>, "
            f"avec un revenu moyen par utilisateur (ARPU) de <b>{arpu}€</b>."
        )
        elements.append(Paragraph(summary_text, body_text_style))
        elements.append(Spacer(1, 20))

        # KPIs Table
        elements.append(
            Paragraph("Indicateurs Clés de Performance (KPIs)", section_title_style)
        )
        kpi_data = [
            ["Total Clients", "Taux de Churn", "ARPU", "CLV Moyen"],
            [f"{total_customers:,}", f"{churn_rate}%", f"{arpu}€", f"{clv}€"],
        ]
        kpi_table = Table(kpi_data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
        kpi_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
                    ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 1), (-1, 1), 14),
                    ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#2563eb")),
                    ("BOTTOMPADDING", (0, 1), (-1, 1), 15),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                ]
            )
        )
        elements.append(kpi_table)
        elements.append(PageBreak())

        # Segmentation
        elements.append(Paragraph("Segmentation Clients", section_title_style))
        chart_files["segments"].seek(0)
        elements.append(Image(chart_files["segments"], width=14 * cm, height=14 * cm))
        elements.append(Spacer(1, 20))

        segment_table_data = [
            ["Segment", "Part (%)", "Caractéristiques", "Actions"],
            ["Premium Users", "15%", "ARPU élevé, fidèles", "Programme VIP"],
            ["Heavy Data Users", "22%", "Forte conso. data", "Upgrade fibre"],
            ["Voice Only", "18%", "Téléphone uniquement", "Cross-sell internet"],
            ["Low ARPU", "20%", "Budget serré", "Promotions ciblées"],
            ["At-Risk", "13%", "Risque de churn", "Rétention proactive"],
            ["Loyal Base", "12%", "Clients fidèles", "Programme fidélité"],
        ]
        segment_table = Table(
            segment_table_data, colWidths=[3.5 * cm, 2 * cm, 5 * cm, 5 * cm]
        )
        segment_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f8fafc")],
                    ),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(segment_table)
        elements.append(PageBreak())

        # Churn Trend
        elements.append(Paragraph("Évolution du Churn", section_title_style))
        chart_files["churn_trend"].seek(0)
        elements.append(Image(chart_files["churn_trend"], width=16 * cm, height=8 * cm))
        elements.append(Spacer(1, 30))

        # Contract Distribution
        elements.append(Paragraph("Distribution par Contrat", section_title_style))
        chart_files["contracts"].seek(0)
        elements.append(Image(chart_files["contracts"], width=16 * cm, height=8 * cm))
        elements.append(PageBreak())

        # Recommendations
        elements.append(Paragraph("Recommandations", section_title_style))
        rec_data = [
            ["Priorité", "Action", "Impact Attendu"],
            ["Haute", "Programme de rétention pour clients At-Risk", "-3% churn"],
            ["Haute", "Campagne d'engagement pour nouveaux clients", "+15% rétention"],
            ["Moyenne", "Offres d'upsell pour Low ARPU", "+10% ARPU"],
            ["Moyenne", "Programme VIP pour Premium Users", "+5% satisfaction"],
        ]
        rec_table = Table(rec_data, colWidths=[2.5 * cm, 10 * cm, 3.5 * cm])
        rec_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f8fafc")],
                    ),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                ]
            )
        )
        elements.append(rec_table)
        elements.append(Spacer(1, 40))

        # Footer
        elements.append(
            Paragraph(
                "Rapport généré par TelcoAnalytics Pro | Confidentiel", subtitle_style
            )
        )

        # Build PDF
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        filename = f"telco_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    except Exception as e:
        logger.error(f"Erreur génération PDF: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}"
        )


# ============== HEALTH CHECK ==============


@api_router.get("/")
async def root():
    return {"message": "Telco Customer Analytics API", "status": "healthy"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=True, log_level="info")
