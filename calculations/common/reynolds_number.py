def calculate_reynolds_number(
    density,
    velocity,
    internal_diameter,
    dynamic_viscosity
):
    """
    Calculate Reynolds Number.

    Parameters
    ----------
    density : float
        Fluid density (kg/m³)

    velocity : float
        Fluid velocity (m/s)

    internal_diameter : float
        Pipe internal diameter (m)

    dynamic_viscosity : float
        Dynamic viscosity (Pa·s)

    Returns
    -------
    float
        Reynolds Number
    """

    reynolds_number = (
        density
        * velocity
        * internal_diameter
    ) / dynamic_viscosity

    return reynolds_number