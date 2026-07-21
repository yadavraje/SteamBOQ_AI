def calculate_pressure_drop(
    friction_factor,
    equivalent_length,
    internal_diameter,
    density,
    velocity
):
    """
    Calculate pressure drop using the
    Darcy-Weisbach Equation.

    Parameters
    ----------
    friction_factor : float
        Darcy friction factor

    equivalent_length : float
        Total equivalent pipe length (m)

    internal_diameter : float
        Pipe internal diameter (m)

    density : float
        Fluid density (kg/m³)

    velocity : float
        Fluid velocity (m/s)

    Returns
    -------
    dict
    """

    pressure_drop_pa = (
        friction_factor
        * (equivalent_length / internal_diameter)
        * (density * velocity**2 / 2)
    )

    return {

        "pressure_drop_pa": pressure_drop_pa,

        "pressure_drop_kpa": pressure_drop_pa / 1000,

        "pressure_drop_bar": pressure_drop_pa / 100000
    }