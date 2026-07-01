import streamlit as st

from components.project_header import show_project_header
from forms.steam_form import steam_form

st.title("⚙️ Engineering")

show_project_header()

tab1, tab2, tab3, tab4 = st.tabs(
    [
        "Steam",
        "Condensate",
        "Distribution Network",
        "Design Summary"
    ]
)

with tab1:

    steam_form()

with tab2:

    st.info("Condensate Module - Coming Soon")

with tab3:

    st.info("Distribution Network Module - Coming Soon")

with tab4:

    st.info("Design Summary - Coming Soon")