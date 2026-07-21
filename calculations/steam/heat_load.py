def calculate_heat_required(
    product_mass,
    specific_heat,
    initial_temperature,
    final_temperature
):
    """
    Calculates total heat required.

    Returns:
        Heat Required (kJ)
    """

    delta_temperature = final_temperature - initial_temperature

    heat_required = (
        product_mass
        * specific_heat
        * delta_temperature
    )

    return heat_required
MINUTES_PER_HOUR = 60


def calculate_heat_load(
    heat_required,
    heating_time_minutes
):
    """
    Calculates heat load.

    Returns:
        Heat Load (kJ/hr)
    """

    heating_time_hours = (
        heating_time_minutes
        / MINUTES_PER_HOUR
    )

    heat_load = (
        heat_required
        / heating_time_hours
    )

    return heat_load
def calculate_product_heating(
    product_mass,
    specific_heat,
    initial_temperature,
    final_temperature,
    heating_time_minutes
):
    """
    Complete Product Heating calculation.
    """

    heat_required = calculate_heat_required(
        product_mass,
        specific_heat,
        initial_temperature,
        final_temperature
    )

    heat_load = calculate_heat_load(
        heat_required,
        heating_time_minutes
    )

    return {
        "heat_required": round(heat_required, 2),
        "heat_load": round(heat_load, 2)
    }