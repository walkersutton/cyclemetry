"""
Application configuration module
"""

import os
from pathlib import Path


class Config:
    """Base configuration"""

    # Application
    APP_NAME = "Cyclemetry"
    VERSION = "2.0.0"

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"

    # Server
    HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
    PORT = int(os.environ.get("FLASK_PORT", 3001))

    # Paths
    BASE_DIR = Path(__file__).parent
    UPLOAD_FOLDER = BASE_DIR / "tmp"
    TEMPLATES_FOLDER = BASE_DIR / "templates"

    # File Upload
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size
    ALLOWED_EXTENSIONS = {"gpx", "gpxinit"}

    # CORS
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,https://walkersutton.com"
    ).split(",")

    # Video Rendering
    DEFAULT_FPS = 30
    MAX_VIDEO_DURATION = 3600  # 1 hour max

    # Logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    @classmethod
    def init_app(cls, app):
        """Initialize application with this config"""
        # Ensure directories exist
        cls.UPLOAD_FOLDER.mkdir(exist_ok=True)
        cls.TEMPLATES_FOLDER.mkdir(exist_ok=True)

        # Set Flask config
        app.config["UPLOAD_FOLDER"] = str(cls.UPLOAD_FOLDER)
        app.config["MAX_CONTENT_LENGTH"] = cls.MAX_CONTENT_LENGTH
        app.config["SECRET_KEY"] = cls.SECRET_KEY


class DevelopmentConfig(Config):
    """Development configuration"""

    DEBUG = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    """Production configuration"""

    DEBUG = False
    LOG_LEVEL = "INFO"

    @classmethod
    def init_app(cls, app):
        super().init_app(app)

        # Production-specific setup
        if cls.SECRET_KEY == "dev-secret-key-change-in-production":
            import warnings

            warnings.warn(
                "Using default secret key in production! "
                "Set SECRET_KEY environment variable."
            )


class TestingConfig(Config):
    """Testing configuration"""

    TESTING = True
    DEBUG = True


# Configuration dictionary
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Get configuration based on environment"""
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config["default"])
