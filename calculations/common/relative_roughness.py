def calculate_relative_roughness(
    absolute_roughness,
    internal_diameter
):
    """
    Calculate Relative Roughness (ε/D)

    Parameters
    ----------
    absolute_roughness : float
        Absolute roughness (m)

    internal_diameter : float
        Pipe ID (m)

    Returns
    -------
    float
    """

    return absolute_roughness / internal_diameter