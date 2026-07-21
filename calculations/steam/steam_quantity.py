def calculate_steam_quantity(heat_load, latent_heat):
    """
    Calculate required steam flow.

    Parameters
    ----------
    heat_load : float
        kJ/hr

    latent_heat : float
        kJ/kg

    Returns
    -------
    float
        Steam Quantity (kg/hr)
    """

    return heat_load / latent_heat