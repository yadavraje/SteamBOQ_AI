from pathlib import Path

import pandas as pd
import streamlit as st


@st.cache_data
def load_fittings_database():
    """
    Load fittings database.
    """

    project_root = Path(__file__).resolve().parents[2]

    db_path = project_root / "databases" / "FITTINGS_DB.xlsx"

    fittings_db = pd.read_excel(
        db_path,
        sheet_name="Fittings"
    )

    return fittings_db