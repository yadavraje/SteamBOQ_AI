import math


def calculate_friction_factor(
    reynolds_number,
    relative_roughness
):
    """
    Calculate Darcy Friction Factor using
    Swamee-Jain Equation.

    Parameters
    ----------
    reynolds_number : float

    relative_roughness : float

    Returns
    -------
    float
    """

    # Laminar Flow
    if reynolds_number < 2300:
        return 64 / reynolds_number

    # Turbulent Flow (Swamee-Jain)

    friction_factor = 0.25 / (
        math.log10(
            (relative_roughness / 3.7)
            +
            (5.74 / (reynolds_number ** 0.9))
        ) ** 2
    )

    return friction_factor