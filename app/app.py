from utils.session import initialize_session

initialize_session()

import streamlit as st

st.set_page_config(
    page_title="SteamBOQ_AI",
    page_icon="♨️",
    layout="wide"
)

st.title("♨️ SteamBOQ_AI")

st.subheader("AI-Assisted Utility Piping BOQ Tool")

st.markdown("---")

st.markdown("""
### Welcome

Use the navigation panel on the left to access different modules.

Current Version: **1.0 MVP**
""")