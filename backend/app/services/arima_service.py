import warnings
from typing import Dict, Any


def forecast_arima(close, steps: int) -> Dict[str, Any]:
    """
    Fit ARIMA(1,1,1) on log close prices and forecast `steps` trading days.
    Falls back to ARIMA(1,1,0) if convergence fails.
    Returns predicted prices and 95% confidence intervals.

    Heavy imports (numpy, pandas, statsmodels) are deferred to first call
    so the server starts up quickly on cold boot.
    """
    # Lazy imports — only loaded when this function is first called
    import numpy as np
    from statsmodels.tsa.arima.model import ARIMA

    # Use last 252 trading days (approx 1 year) for fitting
    series = close.tail(252).copy()
    log_series = np.log(series)

    last_price = float(close.iloc[-1])
    orders_to_try = [(1, 1, 1), (1, 1, 0), (0, 1, 1), (2, 1, 0)]

    fit = None
    for order in orders_to_try:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(log_series, order=order)
                fit = model.fit()
            break
        except Exception:
            continue

    if fit is None:
        # Last resort: naive forecast (random walk = no change)
        return _naive_forecast(last_price, steps)

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            forecast_result = fit.get_forecast(steps=steps)
            forecast_mean = forecast_result.predicted_mean
            conf_int = forecast_result.conf_int(alpha=0.05)

        # Convert log forecasts back to price level
        predicted_prices = np.exp(forecast_mean.values).tolist()
        lower_prices = np.exp(conf_int.iloc[:, 0].values).tolist()
        upper_prices = np.exp(conf_int.iloc[:, 1].values).tolist()

        # The horizon-end forecast
        target_idx = min(steps, len(predicted_prices)) - 1
        return {
            "predicted_price": round(float(predicted_prices[target_idx]), 2),
            "confidence_low": round(float(lower_prices[target_idx]), 2),
            "confidence_high": round(float(upper_prices[target_idx]), 2),
            "all_predictions": [round(p, 2) for p in predicted_prices],
            "model_aic": round(float(fit.aic), 2),
        }
    except Exception:
        return _naive_forecast(last_price, steps)


def _naive_forecast(last_price: float, steps: int) -> Dict[str, Any]:
    """Fallback: assume price stays flat with uncertainty growing over time."""
    import numpy as np
    uncertainty = last_price * 0.005 * np.sqrt(steps)
    return {
        "predicted_price": round(last_price, 2),
        "confidence_low": round(last_price - uncertainty, 2),
        "confidence_high": round(last_price + uncertainty, 2),
        "all_predictions": [round(last_price, 2)] * steps,
        "model_aic": None,
    }
