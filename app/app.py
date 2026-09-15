from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


st.set_page_config(
    page_title="SteamBOQ · Proposal Estimator",
    page_icon="♨️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      [data-testid="stHeader"],
      [data-testid="stToolbar"],
      [data-testid="stSidebar"],
      footer { display: none !important; }
      [data-testid="stAppViewContainer"] { background: #edf3f4; }
      [data-testid="stMainBlockContainer"] {
        max-width: 100%;
        padding: 0 !important;
      }
      iframe[title="streamlit.components.v1.html"] {
        display: block;
        border: 0;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

embed_path = Path(__file__).with_name("steamboq_ui.html")
if not embed_path.exists():
    st.error("SteamBOQ interface asset is missing. Please redeploy the latest GitHub revision.")
    st.stop()

components.html(embed_path.read_text(encoding="utf-8"), height=2400, scrolling=True)
