from typing import Dict, Any


def forecast_trend(close, steps: int) -> Dict[str, Any]:
    """
    Fit polynomial regression (degree=2) on last 90 trading days
    and extrapolate `steps` trading days forward.

    Heavy imports (numpy, sklearn) are deferred to first call
    so the server starts up quickly on cold boot.
    """
    # Lazy imports — only loaded when this function is first called
    import numpy as np
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.linear_model import LinearRegression
    from sklearn.pipeline import Pipeline

    series = close.tail(90).values
    n = len(series)
    last_price = float(close.iloc[-1])

    if n < 10:
        # Not enough data
        return {
            "predicted_price": round(last_price, 2),
            "confidence_low": round(last_price * 0.95, 2),
            "confidence_high": round(last_price * 1.05, 2),
            "all_predictions": [round(last_price, 2)] * steps,
            "r_squared": None,
        }

    X = np.arange(n).reshape(-1, 1)
    y = series

    # Use degree=1 (linear) for stable long-horizon extrapolation.
    # Degree=2 parabolas can produce negative prices over long horizons.
    pipeline = Pipeline([
        ("poly", PolynomialFeatures(degree=1, include_bias=False)),
        ("reg", LinearRegression()),
    ])
    pipeline.fit(X, y)

    # R² score on training data
    r2 = float(pipeline.score(X, y))

    # Predict each future step
    future_X = np.arange(n, n + steps).reshape(-1, 1)
    predictions = pipeline.predict(future_X)

    # Residual std for uncertainty estimation
    train_preds = pipeline.predict(X)
    residuals = y - train_preds
    residual_std = float(np.std(residuals))

    # Uncertainty grows with sqrt of horizon (scaled by 1.5 for conservatism)
    horizon_indices = np.arange(1, steps + 1)
    uncertainty = residual_std * np.sqrt(horizon_indices) * 1.5

    lower = np.maximum(predictions - uncertainty, predictions * 0.5).tolist()
    upper = (predictions + uncertainty).tolist()

    # Clamp predictions to reasonable gold price range (≥10% of last price)
    price_floor = last_price * 0.10
    predictions = np.maximum(predictions, price_floor)
    lower = [max(v, price_floor) for v in lower]

    # Cap annual rate of change at ±20% to prevent momentum over-extrapolation.
    # The cap scales linearly: at step d the max move is ±20% * (d / 252).
    TRADING_DAYS_PER_YEAR = 252
    MAX_ANNUAL_CHANGE = 0.20
    for i in range(steps):
        day = i + 1
        max_move = last_price * MAX_ANNUAL_CHANGE * (day / TRADING_DAYS_PER_YEAR)
        cap_high = last_price + max_move
        cap_low  = last_price - max_move
        predictions[i] = float(np.clip(predictions[i], cap_low, cap_high))
        lower[i]  = max(float(np.clip(lower[i],  cap_low, cap_high)), price_floor)
        upper[i]  = float(np.clip(upper[i],  cap_low, cap_high))

    target_idx = steps - 1
    return {
        "predicted_price": round(float(predictions[target_idx]), 2),
        "confidence_low": round(float(lower[target_idx]), 2),
        "confidence_high": round(float(upper[target_idx]), 2),
        "all_predictions": [round(float(p), 2) for p in predictions],
        "r_squared": round(r2, 4),
    }
