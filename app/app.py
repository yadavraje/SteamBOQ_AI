from utils.session import initialize_session

initialize_session()

import streamlit as st

st.set_page_config(
    page_title="SteamBOQ_AI — Legacy Prototype",
    page_icon="♨️",
    layout="wide"
)

st.title("♨️ SteamBOQ_AI")

st.warning(
    "Legacy Streamlit prototype: this is not the current production application. "
    "Use the canonical SteamBOQ public beta at "
    "https://steamboq-proposal-estimator.briny-giant-5065.chatgpt.site"
)

st.subheader("AI-Assisted Utility Piping BOQ Tool")

st.markdown("---")

st.markdown("""
### Welcome

Use the navigation panel on the left to access the original prototype modules.

Prototype Version: **1.0 MVP — Legacy**
""")
