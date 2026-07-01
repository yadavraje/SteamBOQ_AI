import streamlit as st

def initialize_session():

    defaults = {

        "project_name": "",
        "client": "",
        "prepared_by": "",
        "revision": "0",
        "project_location": "",
        "project_description": "",
        "steam_method": "Product Heating",
        "product_mass": 0.0,
        "specific_heat": 0.0,
        "initial_temperature": 25.0,
        "final_temperature": 100.0,
        "heating_time": 30.0,
        "steam_type": "Saturated",
        "steam_pressure": 3.0,
        "steam_quantity": None,
        "steam_pipe_size": None,
        "steam_velocity": None,
        "pressure_drop": None,
        "condensate_generation": None,
        "condensate_pipe_size": None,

    }

    for key, value in defaults.items():

        if key not in st.session_state:

            st.session_state[key] = value