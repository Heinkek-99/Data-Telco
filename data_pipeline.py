import pandas as pd
import mysql.connector
import matplotlib.pyplot as plt
import seaborn as sns

# Charger le dataset
df = pd.read_csv('data/Telco-Customer-Churn.csv')

# Aperçu des données
print(df.head())

# Supprimer les colonnes inutiles
df = df.drop(['customerID'], axis=1)

# Gérer les valeurs manquantes
df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
df['TotalCharges'].fillna(df['TotalCharges'].median(), inplace=True)

# Convertir les colonnes catégorielles en numériques
df['Churn'] = df['Churn'].map({'Yes': 1, 'No': 0})

# Aperçu des données nettoyées
print(df.head())

# Data  Warehousing avec MySql

# Paramètres de connexion à la base de données MySQL
config = {
    'user': 'root',       # Remplacez par votre nom d'utilisateur MySQL
    'password': '',       # Remplacez par votre mot de passe MySQL
    'host': 'localhost',  # Remplacez par l'adresse du serveur MySQL
    'database': 'telco_data',  # Nom de la base de données
    'raise_on_warnings': True
}

# Établir la connexion
conn = mysql.connector.connect(**config)

# Créer un curseur pour exécuter des requêtes
cursor = conn.cursor()

# Créer la table 'customer_data' si elle n'existe pas
create_table_query = """
CREATE TABLE IF NOT EXISTS customer_data (
    gender VARCHAR(50),
    SeniorCitizen INT,
    Partner VARCHAR(50),
    Dependents VARCHAR(50),
    tenure INT,
    PhoneService VARCHAR(50),
    MultipleLines VARCHAR(50),
    InternetService VARCHAR(50),
    OnlineSecurity VARCHAR(50),
    OnlineBackup VARCHAR(50),
    DeviceProtection VARCHAR(50),
    TechSupport VARCHAR(50),
    StreamingTV VARCHAR(50),
    StreamingMovies VARCHAR(50),
    Contract VARCHAR(50),
    PaperlessBilling VARCHAR(50),
    PaymentMethod VARCHAR(50),
    MonthlyCharges FLOAT,
    TotalCharges FLOAT,
    Churn INT
);
"""
cursor.execute(create_table_query)
conn.commit()

# Charger les données dans la table
for index, row in df.iterrows():
    insert_query = """
    INSERT INTO customer_data (
        gender, SeniorCitizen, Partner, Dependents, tenure,
        PhoneService, MultipleLines, InternetService, OnlineSecurity,
        OnlineBackup, DeviceProtection, TechSupport, StreamingTV,
        StreamingMovies, Contract, PaperlessBilling, PaymentMethod,
        MonthlyCharges, TotalCharges, Churn
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = tuple(row)
    cursor.execute(insert_query, values)
    conn.commit()

# Fermer la connexion
cursor.close()
conn.close()

# Analyse et visualisation

# Connexion à la base de données pour récupérer les données
conn = mysql.connector.connect(**config)
query = "SELECT * FROM customer_data"
df_analysis = pd.read_sql(query, conn)
conn.close()

# Analyse : Taux de churn
churn_rate = df_analysis['Churn'].mean() * 100
print(f"Taux de churn : {churn_rate:.2f}%")

# Visualisation : Distribution des charges mensuelles
plt.figure(figsize=(10, 6))
sns.histplot(df_analysis['MonthlyCharges'], bins=30, kde=True, color='blue')
plt.title('Distribution des Charges Mensuelles')
plt.xlabel('Charges Mensuelles')
plt.ylabel('Nombre de Clients')
plt.show()