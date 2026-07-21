def validate_steam_inputs(
    method,
    product_mass=None,
    specific_heat=None,
    initial_temperature=None,
    final_temperature=None,
    heating_time=None,
    heat_load=None,
    steam_pressure=None
):
    errors = []

    if steam_pressure is None:
        errors.append("Steam pressure is required.")

    if method == "Product Heating":

        if product_mass <= 0:
            errors.append("Product mass must be greater than zero.")

        if specific_heat <= 0:
            errors.append("Specific heat must be greater than zero.")

        if final_temperature <= initial_temperature:
            errors.append(
                "Final temperature must be greater than initial temperature."
            )

        if heating_time <= 0:
            errors.append("Heating time must be greater than zero.")

    elif method == "Known Heat Load":

        if heat_load <= 0:
            errors.append("Heat load must be greater than zero.")

    return errors