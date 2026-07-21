from pathlib import Path

import pandas as pd
import streamlit as st


@st.cache_data
def load_pipe_database():
    """
    Loads the Pipe Database.
    """

    project_root = Path(__file__).resolve().parents[2]

    db_path = project_root / "databases" / "PIPE_DB.xlsx"

    pipe_db = pd.read_excel(
        db_path,
        sheet_name="Pipe_Dimensions"
    )

    return pipe_db