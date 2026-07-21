def estimate_fittings(straight_pipe_length):
    """
    Estimate fitting quantities based on straight pipe length.

    Parameters
    ----------
    straight_pipe_length : float
        Straight pipe length in metres.

    Returns
    -------
    dict
        Estimated fitting quantities.
    """

    elbows_90_lr = max(2, round(straight_pipe_length / 6))

    tees_through = max(1, round(straight_pipe_length / 25))

    gate_valves = max(2, round(straight_pipe_length / 30))

    globe_valves = 1

    y_strainers = 1

    return {

    "ELBOW_90_LR": elbows_90_lr,

    "TEE_THROUGH": tees_through,

    "GATE_VALVE": gate_valves,

    "GLOBE_VALVE": globe_valves,

    "Y_STRAINER": y_strainers

    }