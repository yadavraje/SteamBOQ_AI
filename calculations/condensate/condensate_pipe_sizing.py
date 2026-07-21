from calculations.common.pipe_lookup import load_pipe_database
from calculations.common.velocity import calculate_velocity
from calculations.common.reynolds_number import calculate_reynolds_number
from calculations.common.relative_roughness import calculate_relative_roughness
from calculations.common.friction_factor import calculate_friction_factor
from calculations.common.equivalent_length import calculate_equivalent_length
from calculations.common.pressure_drop import calculate_pressure_drop
from calculations.common.hydraulic_validation import validate_hydraulic_design
from constants.engineering_limits import (
    CONDENSATE_MIN_VELOCITY,
    CONDENSATE_MAX_VELOCITY,
    CONDENSATE_MAX_PRESSURE_DROP_BAR)
def calculate_condensate_pipe_size(
    condensate_quantity,
    condensate_density,
    dynamic_viscosity,
    condensate_pipe_length,
    fluid_service="Condensate",
    min_velocity=CONDENSATE_MIN_VELOCITY,
    max_velocity=CONDENSATE_MAX_VELOCITY,
    max_pressure_drop=CONDENSATE_MAX_PRESSURE_DROP_BAR):
    fitting_quantities = {

    "ELBOW_90_LR": 8,
    "TEE_THROUGH": 2,
    "GATE_VALVE": 2,
    "GLOBE_VALVE": 1,
    "Y_STRAINER": 1

        }
    """
    Select steam pipe size based on allowable velocity.

    Parameters
    ----------
    steam_quantity : float
        Steam flowrate in kg/hr

    specific_volume : float
        Steam specific volume in m³/kg

    fluid_service : str
        Reserved for future use

    min_velocity : float
        Minimum acceptable velocity (m/s)

    max_velocity : float
        Maximum acceptable velocity (m/s)

    Returns
    -------
    dict
    """

    # -----------------------------
    # Mass Flow (kg/s)
    # -----------------------------

    mass_flow = condensate_quantity/3600

    # -----------------------------
    # Volumetric Flow (m³/s)
    # -----------------------------

    volumetric_flow = mass_flow/condensate_density


    # -----------------------------
    # Load Pipe Database
    # -----------------------------

    pipe_db = load_pipe_database()

    evaluation_history = []

    selected_pipe = None

    # -----------------------------
    # Evaluate every pipe
    # -----------------------------

    for _, pipe in pipe_db.iterrows():

        velocity = calculate_velocity(
            volumetric_flow=volumetric_flow,
            internal_flow_area=pipe["Internal_Flow_Area_m2"]
        )

        reynolds_number = calculate_reynolds_number(
        density=condensate_density,
        velocity=velocity,
        internal_diameter=pipe["ID_mm"]/1000,
        dynamic_viscosity=dynamic_viscosity
        )

        relative_roughness = calculate_relative_roughness(
        absolute_roughness=pipe["Absolute_Roughness_mm"]/1000,
        internal_diameter=pipe["ID_mm"]/1000
        )

        friction_factor = calculate_friction_factor(
        reynolds_number=reynolds_number,
        relative_roughness=relative_roughness
        )
        equivalent_length = calculate_equivalent_length(
        straight_pipe_length=condensate_pipe_length,
        internal_diameter=pipe["ID_mm"] / 1000,
        fitting_quantities=fitting_quantities
        )

        pressure_drop = calculate_pressure_drop(
        friction_factor=friction_factor,
        equivalent_length=equivalent_length["Total_Equivalent_Length_m"],
        internal_diameter=pipe["ID_mm"] / 1000,
        density=condensate_density,
        velocity=velocity
        )

        validation = validate_hydraulic_design(
        velocity=velocity,
        pressure_drop_bar=pressure_drop["pressure_drop_bar"],
        min_velocity=min_velocity,
        max_velocity=max_velocity,
        max_pressure_drop=max_pressure_drop
        )

        if pipe["NPS"] in ["1", "1-1/4", "1-1/2", "2"]:
            print(pipe["NPS"], validation)


        if validation["Acceptable"]:
            if selected_pipe is None:

                selected_pipe = pipe.to_dict()
                selected_pipe.update({

                    "Velocity_mps": round(velocity, 2),
                    "Reynolds_Number": round(reynolds_number),
                    "Relative_Roughness": relative_roughness,
                    "Friction_Factor": friction_factor,
                    "Pressure_Drop_kPa": pressure_drop["pressure_drop_kpa"],
                    "Pressure_Drop_bar": pressure_drop["pressure_drop_bar"]
                    })
                selected_pipe.update(validation)
            
                    

        evaluation_history.append({

            "NPS": pipe["NPS"],
            "NB": pipe["NB"],
            "ID_mm": pipe["ID_mm"],
            "Area_m2": pipe["Internal_Flow_Area_m2"],
            "Velocity_mps": round(velocity, 2),
            "Reynolds_No": round(reynolds_number),
            "Relative_Roughness": round(relative_roughness,6),
            "Friction_Factor": round(friction_factor, 5),
            "Pressure_Drop_kPa": round(pressure_drop["pressure_drop_kpa"], 2),
            "Velocity_Status": validation["Velocity_Status"],
            "Pressure_Drop_Status": validation["Pressure_Drop_Status"],
            "Overall_Status": validation["Overall_Status"],

            })
        

    # If no suitable pipe is found, use the largest pipe available
    if selected_pipe is None:

        last_pipe = pipe_db.iloc[-1]

        velocity = calculate_velocity(
        volumetric_flow=volumetric_flow,
        internal_flow_area=last_pipe["Internal_Flow_Area_m2"]
        )

        selected_pipe = last_pipe.to_dict()
        selected_pipe["Velocity_mps"] = round(velocity, 2)
        selected_pipe["Status"] = "Velocity Too Low"

    # -----------------------------
    # Return Results
    # -----------------------------

    return {

        "selected_pipe": selected_pipe,

        "evaluation_history": evaluation_history,

        "mass_flow": mass_flow,

        "volumetric_flow": volumetric_flow,

        "equivalent_length": equivalent_length,

        "design_limits": {

        "min_velocity": min_velocity,

        "max_velocity": max_velocity,

        "max_pressure_drop": max_pressure_drop}

    }
