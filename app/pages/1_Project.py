import streamlit as st
from components.project_header import show_project_header

st.title("📁 Project")

st.session_state.project_name = st.text_input(
    "Project Name",
    value=st.session_state.project_name
)

st.session_state.client = st.text_input(
    "Client",
    value=st.session_state.client
)

st.session_state.prepared_by = st.text_input(
    "Prepared By",
    value=st.session_state.prepared_by
)

st.session_state.revision = st.text_input(
    "Revision",
    value=st.session_state.revision
)

st.session_state.project_location = st.text_input(
    "Project Location",
    value=st.session_state.project_location
)

st.session_state.project_description = st.text_area(
    "Project Description",
    value=st.session_state.project_description
)