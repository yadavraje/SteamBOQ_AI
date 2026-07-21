def calculate_velocity(
    volumetric_flow,
    internal_flow_area
    ):
    """
    Calculates fluid velocity.

    Parameters
    ----------
    volumetric_flow : float
        m³/s

    internal_flow_area : float
        m²

    Returns
    -------
    float
        Velocity (m/s)
    """

    velocity = volumetric_flow / internal_flow_area

    return velocity