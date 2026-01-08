import sys
import os
import tempfile


def WRITE_DIR():
    """Get the base directory for writing files - uses temp dir when running as frozen bundle."""
    if getattr(sys, "frozen", False):
        # Running as PyInstaller bundle - use system temp directory
        write_dir = os.path.join(tempfile.gettempdir(), "cyclemetry")
    else:
        # Running from source
        write_dir = "."
    os.makedirs(write_dir, exist_ok=True)
    return write_dir


def FRAMES_DIR():
    """Get the frames directory."""
    frames_dir = os.path.join(WRITE_DIR(), "frames")
    os.makedirs(frames_dir, exist_ok=True)
    return frames_dir


def PUBLIC_DIR():
    """Get the public directory for serving assets."""
    public_dir = os.path.join(WRITE_DIR(), "public")
    os.makedirs(public_dir, exist_ok=True)
    return public_dir


def DOWNLOADS_DIR():
    """Get the user's Downloads directory for final output."""
    downloads = os.path.join(os.path.expanduser("~"), "Downloads", "Cyclemetry")
    os.makedirs(downloads, exist_ok=True)
    return downloads


def FONTS_DIR():
    """Get the fonts directory - uses bundled fonts when frozen."""
    if getattr(sys, "frozen", False):
        # Running as PyInstaller bundle - fonts bundled with app
        return os.path.join(sys._MEIPASS, "fonts") + "/"
    else:
        # Running from source
        return "./fonts/"


# UNITS
UNIT_IMPERIAL = "imperial"
UNIT_METRIC = "metric"


# CONVERSIONS

## IMPERIAL
FT_CONVERSION = 3.28084
MPH_CONVERSION = 2.23694

## METRIC
KMH_CONVERSION = 3.6


ELEVATION_CONVERSION_MAP = {UNIT_IMPERIAL: FT_CONVERSION, UNIT_METRIC: 1}


# ATTRIBUTES
ATTR_CADENCE = "cadence"
ATTR_COURSE = "course"
ATTR_ELEVATION = "elevation"
ATTR_GRADIENT = "gradient"
ATTR_HEARTRATE = "heartrate"
ATTR_POWER = "power"
ATTR_SPEED = "speed"
ATTR_TIME = "time"
ATTR_TEMPERATURE = "temperature"

NO_INTERPOLATE_ATTRIBUTES = [ATTR_TIME]

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


# SUFFIXES
DEFAULT_SUFFIX_MAP = {
    ATTR_CADENCE: " rpm",
    ATTR_ELEVATION: {
        UNIT_IMPERIAL: " ft",
        UNIT_METRIC: " m",
    },
    ATTR_GRADIENT: " %",
    ATTR_HEARTRATE: " bpm",
    ATTR_POWER: " W",
    ATTR_SPEED: {
        UNIT_IMPERIAL: " mph",
        UNIT_METRIC: " km/h",
    },
    ATTR_TEMPERATURE: {
        UNIT_IMPERIAL: "°F",
        UNIT_METRIC: "°C",
    },
}


# DEFAULT CONFIG VALUES
DEFAULT_OVERLAY_FILENAME = "overlay.mov"
DEFAULT_DPI = 300
DEFAULT_LINE_WIDTH = 1.75
DEFAULT_MARGIN = 0.1
DEFAULT_POINT_WEIGHT = 80
DEFAULT_OPACITY = 1
DEFAULT_COLOR = "#ffffff"
