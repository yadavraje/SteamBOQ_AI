from constants.engineering_limits import (
    STEAM_MIN_VELOCITY,
    STEAM_MAX_VELOCITY,
    STEAM_MAX_PRESSURE_DROP_BAR,
    CONDENSATE_MIN_VELOCITY,
    CONDENSATE_MAX_VELOCITY,
    CONDENSATE_MAX_PRESSURE_DROP_BAR)

def build_steam_results(
    session,
    steam_pipe_selection,
    condensate_pipe_selection
):
    """
    Build complete Engineering Results report
    for Steam Distribution.

    Returns
    -------
    dict
    """

    # ==========================================================
    # Extract Results
    # ==========================================================

    steam_pipe = steam_pipe_selection["selected_pipe"]
    steam_equivalent_length = steam_pipe_selection["equivalent_length"]

    condensate_pipe = condensate_pipe_selection["selected_pipe"]
    condensate_equivalent_length = condensate_pipe_selection["equivalent_length"]

    # ==========================================================
    # Steam Summary
    # ==========================================================

    steam_summary = [

        {
            "Parameter": "Heat Required",
            "Value": round(session.heat_required, 2),
            "Unit": "kJ"
        },

        {
            "Parameter": "Heat Load",
            "Value": round(session.heat_load, 2),
            "Unit": "kW"
        },

        {
            "Parameter": "Steam Pressure",
            "Value": session.steam_pressure,
            "Unit": "barg"
        },

        {
            "Parameter": "Steam Saturation Temperature",
            "Value": round(session.sat_temp, 2),
            "Unit": "°C"
        },

        {
            "Parameter": "Steam Quantity",
            "Value": round(session.steam_quantity, 2),
            "Unit": "kg/hr"
        }

    ]

    # ==========================================================
    # Steam Pipe Selection
    # ==========================================================

    steam_pipe_summary = [

        {
            "Parameter": "Pipe Size",
            "Value": steam_pipe["NPS"],
            "Unit": "NPS"
        },

        {
            "Parameter": "Nominal Bore",
            "Value": steam_pipe["NB"],
            "Unit": "NB"
        },

        {
            "Parameter": "Schedule",
            "Value": steam_pipe["Schedule"],
            "Unit": "-"
        },

        {
            "Parameter": "Material",
            "Value": steam_pipe["Material"],
            "Unit": "-"
        },

        {
            "Parameter": "Internal Diameter",
            "Value": round(steam_pipe["ID_mm"],2),
            "Unit": "mm"
        },

        {
            "Parameter": "Velocity",
            "Value": round(steam_pipe["Velocity_mps"],2),
            "Unit": "m/s"
        },

        {
            "Parameter": "Pressure Drop",
            "Value": round(steam_pipe["Pressure_Drop_bar"],3),
            "Unit": "bar"
        }

    ]

    # ==========================================================
    # Steam Hydraulic Validation
    # ==========================================================

    steam_hydraulic_validation = [

        {
            "Check":"Velocity",
            "Requirement":f"{STEAM_MIN_VELOCITY} - {STEAM_MAX_VELOCITY} m/s",
            "Actual":round(steam_pipe["Velocity_mps"],2),
            "Status":steam_pipe["Velocity_Status"]
        },

        {
            "Check":"Pressure Drop",
            "Requirement":f"< {STEAM_MAX_PRESSURE_DROP_BAR} bar",
            "Actual":round(steam_pipe["Pressure_Drop_bar"],3),
            "Status":steam_pipe["Pressure_Drop_Status"]
        },

        {
            "Check":"Overall",
            "Requirement":"Both checks acceptable",
            "Actual":"-",
            "Status":steam_pipe["Overall_Status"]
        }

    ]

    # ==========================================================
    # Steam Distribution Summary
    # ==========================================================

    steam_pipe_distribution = [

        {
            "Parameter":"Straight Pipe Length",
            "Value":steam_equivalent_length["Straight_Length_m"],
            "Unit":"m"
        },

        {
            "Parameter":"Equivalent Fittings Length",
            "Value":steam_equivalent_length["Equivalent_Fittings_Length_m"],
            "Unit":"m"
        },

        {
            "Parameter":"Total Equivalent Length",
            "Value":steam_equivalent_length["Total_Equivalent_Length_m"],
            "Unit":"m"
        }

    ]

    steam_fittings = steam_equivalent_length["Fitting_Details"]

    # ==========================================================
    # Condensate Summary
    # ==========================================================

    condensate_summary = [

        {
            "Parameter":"Condensate Quantity",
            "Value":round(session.condensate_quantity,2),
            "Unit":"kg/hr"
        },

        {
            "Parameter":"Condensate Density",
            "Value":round(session.condensate_density,2),
            "Unit":"kg/m³"
        }

    ]

    # ==========================================================
    # Condensate Pipe
    # ==========================================================

    condensate_pipe_summary = [

        {
            "Parameter":"Pipe Size",
            "Value":condensate_pipe["NPS"],
            "Unit":"NPS"
        },

        {
            "Parameter":"Nominal Bore",
            "Value":condensate_pipe["NB"],
            "Unit":"NB"
        },

        {
            "Parameter":"Schedule",
            "Value":condensate_pipe["Schedule"],
            "Unit":"-"
        },

        {
            "Parameter":"Material",
            "Value":condensate_pipe["Material"],
            "Unit":"-"
        },

        {
            "Parameter":"Velocity",
            "Value":round(condensate_pipe["Velocity_mps"],2),
            "Unit":"m/s"
        },

        {
            "Parameter":"Pressure Drop",
            "Value":round(condensate_pipe["Pressure_Drop_bar"],3),
            "Unit":"bar"
        }

    ]

    # ==========================================================
    # Condensate Hydraulic Validation
    # ==========================================================

    condensate_validation = [

        {
            "Check":"Velocity",
            "Requirement":f"{CONDENSATE_MIN_VELOCITY} - {CONDENSATE_MAX_VELOCITY} m/s",
            "Actual":round(condensate_pipe["Velocity_mps"],2),
            "Status":condensate_pipe["Velocity_Status"]
        },

        {
            "Check":"Pressure Drop",
            "Requirement":f"< {CONDENSATE_MAX_PRESSURE_DROP_BAR} bar",
            "Actual":round(condensate_pipe["Pressure_Drop_bar"],3),
            "Status":condensate_pipe["Pressure_Drop_Status"]
        },

        {
            "Check":"Overall",
            "Requirement":"Both checks acceptable",
            "Actual":"-",
            "Status":condensate_pipe["Overall_Status"]
        }

    ]

    # ==========================================================
    # Condensate Distribution
    # ==========================================================

    condensate_distribution = [

        {
            "Parameter":"Straight Pipe Length",
            "Value":condensate_equivalent_length["Straight_Length_m"],
            "Unit":"m"
        },

        {
            "Parameter":"Equivalent Fittings Length",
            "Value":condensate_equivalent_length["Equivalent_Fittings_Length_m"],
            "Unit":"m"
        },

        {
            "Parameter":"Total Equivalent Length",
            "Value":condensate_equivalent_length["Total_Equivalent_Length_m"],
            "Unit":"m"
        }

    ]

    condensate_fittings = condensate_equivalent_length["Fitting_Details"]

    # ==========================================================
    # Return Report
    # ==========================================================

    return {

        "steam_summary": steam_summary,
        "steam_pipe_summary": steam_pipe_summary,
        "steam_hydraulic_validation": steam_hydraulic_validation,
        "steam_pipe_distribution": steam_pipe_distribution,
        "steam_fittings": steam_fittings,

        "condensate_summary": condensate_summary,
        "condensate_pipe_summary": condensate_pipe_summary,
        "condensate_hydraulic_validation": condensate_validation,
        "condensate_pipe_distribution": condensate_distribution,
        "condensate_fittings": condensate_fittings

    }