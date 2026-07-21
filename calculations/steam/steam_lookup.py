from pathlib import Path

import pandas as pd
import streamlit as st


@st.cache_data
def load_steam_database():

    project_root = Path(__file__).resolve().parents[2]

    print("Project Root:", project_root)

    db_path = project_root / "databases" / "STEAM_DB.xlsx"

    print("Database Path:", db_path)

    steam_db = pd.read_excel(
        db_path,
        sheet_name="Steam_Properties"
    )

    return steam_db


def get_steam_properties(pressure):

    steam_db = load_steam_database()

    row = steam_db.loc[
        steam_db["Pressure_barg"] == pressure
    ]

    if row.empty:
        raise ValueError(
            f"Steam properties not found for {pressure} barg."
        )

    row = row.iloc[0]

    return {
        "pressure": float(row["Pressure_barg"]),
        "sat_temp": float(row["Sat_Temp_C"]),
        "hf": float(row["hf_kJkg"]),
        "hfg": float(row["hfg_kJkg"]),
        "hg": float(row["hg_kJkg"]),
        "specific_volume": float(row["Specific_Volume_Steam_m3kg"]),
        "density": float(1/row["Specific_Volume_Steam_m3kg"]),
        "dynamic_viscosity": float(row["Dynamic_Viscosity_kg_ms"]),
        "kinematic_viscosity": float(row["Dynamic_Viscosity_kg_ms"]) / (1 / row["Specific_Volume_Steam_m3kg"]),
        "condensate_density": float(row["Density_water_kgm3"]),
        "condensate_dynamic_viscosity": float(row["Dynamic_Viscosity_water_kg_ms"])
    }