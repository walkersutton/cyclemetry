ATTR_CADENCE = "cadence"
ATTR_COURSE = "course"
ATTR_ELEVATION = "elevation"
ATTR_GRADIENT = "gradient"
ATTR_HEARTRATE = "heartrate"
ATTR_POWER = "power"
ATTR_SPEED = "speed"
ATTR_TIME = "time"
ATTR_TEMPERATURE = "temperature"

ALL_ATTRIBUTES = [
    ATTR_CADENCE,
    ATTR_COURSE,
    ATTR_ELEVATION,
    ATTR_GRADIENT,
    ATTR_HEARTRATE,
    ATTR_POWER,
    ATTR_SPEED,
    ATTR_TIME,
    ATTR_TEMPERATURE,
]

DEFAULT_SUFFIX_MAP = {
    ATTR_CADENCE: " rpm",
    ATTR_ELEVATION: {
        "imperial": " ft",
        "metric": " m",
    },
    ATTR_GRADIENT: " %",
    ATTR_HEARTRATE: " bpm",
    ATTR_POWER: " W",
    ATTR_SPEED: {
        "imperial": " mph",
        "metric": " km/h",
    },
    ATTR_TEMPERATURE: {
        "imperial": "°F",
        "metric": "°C",
    },
}
