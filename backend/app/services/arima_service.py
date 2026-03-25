import numpy as np
import pandas as pd
import warnings
from typing import Dict, Any, List, Optional

from statsmodels.tsa.arima.model import ARIMA
import warnings


def _fit_arima(log_series: pd.Series):
    """Fit ARIMA on log price series, trying multiple orders. Returns fitted model or None."""
    orders_to_try = [(1, 1, 1), (1, 1, 0), (0, 1, 1), (2, 1, 0)]
    for order in orders_to_try:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(log_series, order=order)
                fit = model.fit()
            return fit
        except Exception:
            continue
    return None


def forecast_arima_multi(close: pd.Series, steps_list: List[int]) -> Dict[int, Dict[str, Any]]:
    """
    Fit ARIMA once on log close prices and forecast for multiple step counts.
    Returns a dict mapping each step count to its forecast result.
    Dramatically faster than calling forecast_arima() N times.
    """
    series = close.tail(252).copy()
    log_series = np.log(series)
    last_price = float(close.iloc[-1])
    max_steps = max(steps_list)

    fit = _fit_arima(log_series)
    if fit is None:
        return {steps: _naive_forecast(last_price, steps) for steps in steps_list}

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            forecast_result = fit.get_forecast(steps=max_steps)
            forecast_mean = forecast_result.predicted_mean
            conf_int = forecast_result.conf_int(alpha=0.05)

        predicted_prices = np.exp(forecast_mean.values).tolist()
        lower_prices = np.exp(conf_int.iloc[:, 0].values).tolist()
        upper_prices = np.exp(conf_int.iloc[:, 1].values).tolist()
        aic = round(float(fit.aic), 2)

        results = {}
        for steps in steps_list:
            idx = min(steps, len(predicted_prices)) - 1
            results[steps] = {
                "predicted_price": round(float(predicted_prices[idx]), 2),
                "confidence_low": round(float(lower_prices[idx]), 2),
                "confidence_high": round(float(upper_prices[idx]), 2),
                "all_predictions": [round(p, 2) for p in predicted_prices[:steps]],
                "model_aic": aic,
            }
        return results
    except Exception:
        return {steps: _naive_forecast(last_price, steps) for steps in steps_list}


def forecast_arima(close: pd.Series, steps: int) -> Dict[str, Any]:
    """Single-timeframe forecast (kept for compatibility). Prefer forecast_arima_multi."""
    return forecast_arima_multi(close, [steps])[steps]


def _naive_forecast(last_price: float, steps: int) -> Dict[str, Any]:
    """Fallback: assume price stays flat with uncertainty growing over time."""
    uncertainty = last_price * 0.005 * np.sqrt(steps)
    return {
        "predicted_price": round(last_price, 2),
        "confidence_low": round(last_price - uncertainty, 2),
        "confidence_high": round(last_price + uncertainty, 2),
        "all_predictions": [round(last_price, 2)] * steps,
        "model_aic": None,
    }
