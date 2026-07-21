def validate_hydraulic_design(
    velocity,
    pressure_drop_bar,
    min_velocity,
    max_velocity,
    max_pressure_drop):

    if velocity < min_velocity:
        velocity_status = "Too Low"
        velocity_check = False

    elif velocity > max_velocity:
        velocity_status = "Too High"
        velocity_check = False

    else:
        velocity_status = "Acceptable"
        velocity_check = True

    if pressure_drop_bar <= max_pressure_drop:
        pressure_drop_status = "Acceptable"
        pressure_drop_check = True

    else:
        pressure_drop_status = "Exceeds Allowable Limit"
        pressure_drop_check = False

    if velocity_check and pressure_drop_check:
        overall_status = "Within Allowable Limit"

    else:
        overall_status = "Not Acceptable"

    return {

    "Acceptable": velocity_check and pressure_drop_check,

    "Velocity_Check": velocity_check,
    "Velocity_Status": velocity_status,

    "Pressure_Drop_Check": pressure_drop_check,
    "Pressure_Drop_Status": pressure_drop_status,

    "Overall_Status": overall_status

    }   