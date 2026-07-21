from calculations.common.fittings_lookup import load_fittings_database


def calculate_equivalent_length(
    straight_pipe_length,
    internal_diameter,
    fitting_quantities
    ):
    """
    Calculate total equivalent pipe length.

    Parameters
    ----------
    straight_pipe_length : float
        Straight pipe length (m)

    internal_diameter : float
        Pipe internal diameter (m)

    fitting_quantities : dict
        Dictionary of fitting codes and quantities.

    Returns
    -------
    dict
    """

    fittings_db = load_fittings_database()

    lookup = fittings_db.set_index("Fitting_Code").to_dict("index")

    equivalent_fittings_length = 0

    fitting_details = []

    for fitting_code, quantity in fitting_quantities.items():

        if fitting_code not in lookup:
            continue

        le_over_d = lookup[fitting_code]["Le_over_D"]

        equivalent_length_per_fitting = (
            le_over_d * internal_diameter
        )

        total_equivalent = (
            equivalent_length_per_fitting * quantity
        )

        equivalent_fittings_length += total_equivalent

        fitting_details.append({

            "Fitting_Code": fitting_code,

            "Description":
                lookup[fitting_code]["Description"],

            "Quantity": quantity,

            "Le_over_D": le_over_d,

            "Equivalent_Length_m":
                round(total_equivalent, 3)

        })

    total_equivalent_length = (
        straight_pipe_length
        + equivalent_fittings_length
    )

    return {

        "Straight_Length_m":
            round(straight_pipe_length, 3),

        "Equivalent_Fittings_Length_m":
            round(equivalent_fittings_length, 3),

        "Total_Equivalent_Length_m":
            round(total_equivalent_length, 3),

        "Fitting_Details":
            fitting_details

    }