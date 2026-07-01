import streamlit as st


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

        st.session_state.steam_type = st.selectbox(
            "Steam Type",
            [
                "Saturated"
            ]
        )

        st.session_state.steam_pressure = st.number_input(
            "Steam Pressure (barg)",
            min_value=0.0,
            value=3.0
        )

    st.divider()

    if st.button("Calculate Steam Requirement"):

        st.success("Calculation module will be connected in the next milestone.")

    st.markdown("## Results")

    st.metric("Steam Quantity", "-")
    st.metric("Steam Pipe Size", "-")
    st.metric("Steam Velocity", "-")
    st.metric("Pressure Drop", "-")
    st.metric("Condensate Generation", "-")
    st.metric("Condensate Pipe Size", "-")