import time

_cache = {}

def cached_fetch(key, func, ttl=600):
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < ttl:
        return _cache[key]["data"]
    data = func()
    _cache[key] = {"data": data, "ts": now}
    return data
