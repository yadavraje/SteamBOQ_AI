import streamlit as st
from components.engineering_table import engineering_table
from calculations.steam.heat_load import calculate_product_heating
from calculations.steam.steam_lookup import get_steam_properties
from calculations.steam.steam_quantity import calculate_steam_quantity
from calculations.steam.steam_results import build_steam_results
from calculations.common.pipe_lookup import load_pipe_database
from calculations.steam.steam_pipe_sizing import calculate_steam_pipe_size
from calculations.common.reynolds_number import calculate_reynolds_number
from calculations.steam.steam_velocity import calculate_velocity
from components.engineering_results import display_engineering_results
from calculations.condensate.condensate_pipe_sizing import calculate_condensate_pipe_size

def steam_form():

    st.subheader("Steam")

    # Steam Requirement Method
    method = st.radio(
        "Steam Requirement Method",
        [
            "Product Heating",
            "Heat Load (Coming Soon)",
            "Direct Steam Injection (Coming Soon)",
            "Heat Exchanger (Coming Soon)",
            "Sterilization (Coming Soon)"
        ]
    )

    st.session_state.steam_method = method

    if method == "Product Heating":

        st.markdown("### Product Data")

        st.session_state.product_mass = st.number_input(
            "Product Mass (kg)",
            min_value=0.0,
            value=0.0
        )

        st.session_state.specific_heat = st.number_input(
            "Specific Heat (kJ/kg°C)",
            min_value=0.0,
            value=0.0
        )

        st.session_state.initial_temperature = st.number_input(
            "Initial Temperature (°C)",
            value=25.0
        )

        st.session_state.final_temperature = st.number_input(
            "Final Temperature (°C)",
            value=100.0
        )

        st.session_state.heating_time = st.number_input(
            "Heating Time (minutes)",
            min_value=1.0,
            value=30.0
        )

        st.markdown("### Steam Conditions")

        st.session_state.steam_type = "Saturated Steam"

        st.write("**Steam Type:** Saturated Steam")

        st.session_state.steam_pressure = st.number_input(
            "Steam Pressure (barg)",
            min_value=0.0,
            value=3.0
        )
        st.divider()
        st.markdown("### Distribution System")

        st.session_state.pipe_length = st.number_input(
        "Steam Pipe Length (m)",
        min_value=1.0,
        value=st.session_state.pipe_length,
        step=1.0
        )

        st.session_state.condensate_pipe_length = st.number_input(
        "Condensate Pipe Length (m)",
        min_value=1.0,
        value=st.session_state.condensate_pipe_length,
        step=1.0
        )

        st.caption(
        "Pressure drop is currently calculated considering only the straight pipe length. "
        "Fittings and valves will be included in a future version."
        )

        st.divider()

    if st.button("Calculate Steam Requirement"):

        results = calculate_product_heating(
        product_mass=st.session_state.product_mass,
        specific_heat=st.session_state.specific_heat,
        initial_temperature=st.session_state.initial_temperature,
        final_temperature=st.session_state.final_temperature,
        heating_time_minutes=st.session_state.heating_time
        )

        steam = get_steam_properties(
        st.session_state.steam_pressure
        )


        steam_qty = calculate_steam_quantity(
        heat_load=results["heat_load"],
        latent_heat=steam["hfg"]
        )

        #Pipe Sizing
        pipe_selection = calculate_steam_pipe_size(
        steam_quantity=steam_qty,
        specific_volume=steam["specific_volume"],
        dynamic_viscosity=steam["dynamic_viscosity"],
        steam_pipe_length=st.session_state.pipe_length,
        fluid_service="Steam"
        )

        condensate_quantity=steam_qty #kg/hr

        condensate_pipe_selection = calculate_condensate_pipe_size(
        condensate_quantity=steam_qty,
        condensate_density=steam["condensate_density"],
        dynamic_viscosity=steam["condensate_dynamic_viscosity"],
        condensate_pipe_length=st.session_state.condensate_pipe_length,
        fluid_service="Condensate"
        )
        
        
        # Store Results
        st.session_state.steam_quantity = steam_qty
        st.session_state.sat_temp = steam["sat_temp"]
        st.session_state.hf = steam["hf"]
        st.session_state.hfg = steam["hfg"]
        st.session_state.hg = steam["hg"]
        st.session_state.specific_volume = steam["specific_volume"]
        st.session_state.condensate_quantity = steam_qty
        st.session_state.condensate_density = steam["condensate_density"]
        st.session_state.heat_required = results["heat_required"]
        st.session_state.heat_load = results["heat_load"]
        # Store Pipe Selection Result
        st.session_state.selected_pipe = pipe_selection["selected_pipe"]
        st.session_state.pipe_evaluation = pipe_selection["evaluation_history"]
        st.session_state.equivalent_length = pipe_selection["equivalent_length"]
        st.session_state.selected_condensate_pipe = (condensate_pipe_selection["selected_pipe"])
        st.session_state.condensate_pipe_evaluation = (condensate_pipe_selection["evaluation_history"])
        st.session_state.condensate_equivalent_length = (condensate_pipe_selection["equivalent_length"])
        
        
        st.subheader("Equivalent Length Details")
        """st.write(st.session_state.equivalent_length)"""

    # Display Engineering Results
    if st.session_state.get("heat_required") is not None:

        """table_data = build_steam_results(st.session_state)
        engineering_table(table_data)
        st.write(pipe_selection)"""
        report = build_steam_results(st.session_state,
                                     pipe_selection, condensate_pipe_selection)
        
        display_engineering_results(report)