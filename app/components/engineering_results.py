import streamlit as st
from components.engineering_table import engineering_table


def display_engineering_results(report):
    """
    Display complete engineering report.
    """

    # ==========================================================
    # Steam Summary
    # ==========================================================

    st.subheader("Steam Summary")

    engineering_table(report["steam_summary"])

    # ==========================================================
    # Pipe Selection
    # ==========================================================

    st.subheader("Selected Pipe")

    engineering_table(report["steam_pipe_summary"])

    # ==========================================================
    # Steam Hydraulic Validation
    # ==========================================================

    st.subheader("Hydraulic Validation")

    engineering_table(report["steam_hydraulic_validation"])

    # ==========================================================
    # Distribution Network
    # ==========================================================

    st.subheader("Distribution Network")

    engineering_table(report["steam_pipe_distribution"])

    # ==========================================================
    # Fitting Detailsfor Steam Line
    # ==========================================================

    st.subheader("Estimated Fittings for Steam Line")

    engineering_table(report["steam_fittings"])

    # ==========================================================
    # Condensate Pipe Selection
    # ==========================================================


    st.subheader("Condensate Pipe Selection")

    engineering_table(
    report["condensate_pipe_summary"]
    )

    # ==========================================================
    # Condensate Hydraulic Validation
    # ==========================================================

    st.subheader("Condensate Hydraulic Validation")

    engineering_table(
    report["condensate_hydraulic_validation"]
    )
    # ==========================================================
    # Distribution Network
    # ==========================================================

    st.subheader("Condensate Distribution Network")

    engineering_table(report["condensate_pipe_distribution"])

    # ==========================================================
    # Fitting Details for Condensate Line
    # ==========================================================

    st.subheader("Estimated Fittings for Condensate Line")

    engineering_table(
    report["condensate_fittings"]
    )