# Standard library imports
import gc
import logging
import os
import psutil
import shutil
import time
import uuid
import sys

# Framework imports
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

import constant

# Global variable to track video render progress
video_render_progress = {
    "current": 0,
    "total": 0,
    "status": "idle",  # idle, rendering, complete, error, cancelled
    "message": "",
    "start_time": None,
    "frame_times": [],  # Track recent frame times for smoothing
}

# Use extension names without leading dots
ALLOWED_EXTENSIONS = {"gpx", "js", "html", "jpg", "png", "mov"}

# Global flag to cancel rendering
cancel_render_flag = False

# Flag to prevent concurrent demo frame generation (prevents OOM)
demo_frame_in_progress = False

# Flag to track if heavy libraries are loaded
backend_ready = False

# Configure logging to both stdout and file for debugging sidecar
log_handlers = [logging.StreamHandler(sys.stdout)]
try:
    log_handlers.append(logging.FileHandler("/tmp/cyclemetry_startup.log", mode="w"))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=log_handlers,
)


app = Flask(__name__)

# Configure directories using constant.py helper functions
WRITE_DIR = constant.WRITE_DIR()
PUBLIC_DIR = constant.PUBLIC_DIR()
UPLOAD_DIR = os.path.join(WRITE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

if getattr(sys, "frozen", False):
    # Running as compiled PyInstaller bundle
    BASE_DIR = sys._MEIPASS
else:
    # Running from source
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.config["UPLOAD_FOLDER"] = UPLOAD_DIR

CORS(
    app,
    origins="*",  # Allow all origins temporarily for debugging
)

# app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@app.errorhandler(406)
def bad_request(error):
    return make_response(
        jsonify({"error": "Bad Request sowwy - " + error.description}), 406
    )


@app.route("/templates/<filename>")
def get_template(filename):
    """Serve a template JSON file."""
    if not filename.endswith(".json"):
        return make_response(jsonify({"error": "Invalid file type"}), 400)

    # 1. Try user templates first
    user_path = os.path.join(constant.TEMPLATES_DIR(), filename)
    if os.path.exists(user_path):
        from flask import send_from_directory

        return send_from_directory(constant.TEMPLATES_DIR(), filename)

    # 2. Try bundled templates
    bundled_dir = os.path.join(BASE_DIR, "templates")
    if os.path.exists(os.path.join(bundled_dir, filename)):
        from flask import send_from_directory

        return send_from_directory(bundled_dir, filename)

    return make_response(jsonify({"error": "Template not found"}), 404)


@app.route("/api/load-gpx", methods=["POST"])
def load_gpx():
    data = request.json
    if not data or "path" not in data:
        return make_response(jsonify({"error": "invalid request"}), 400)

    path = data["path"]
    if not os.path.exists(path):
        return make_response(jsonify({"error": "file not found"}), 404)

    filename = os.path.basename(path)
    dest_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        shutil.copy2(path, dest_path)

        # Analyze the GPX file
        from scene import Activity

        activity = Activity(dest_path)
        duration_seconds = len(activity.time) if hasattr(activity, "time") else 0

        logging.info(f"GPX loaded from path: {path}, duration: {duration_seconds}s")

        return jsonify(
            {
                "data": "file loaded",
                "filename": filename,
                "duration_seconds": duration_seconds,
                "has_data": hasattr(activity, "time") and len(activity.time) > 0,
            }
        )
    except Exception as e:
        logging.error(f"Error loading GPX from path {path}: {e}")
        return make_response(jsonify({"error": str(e)}), 500)


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return make_response(jsonify({"error": "invalid request"}), 400)
    file = request.files["file"]
    if file.filename == "":
        return make_response(jsonify({"error": "no file selected"}), 400)
    if file and allowed_file(file.filename):
        path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
        file.save(path)

        # Analyze the GPX file to get metadata
        try:
            from scene import Activity
            activity = Activity(path)
            duration_seconds = len(activity.time) if hasattr(activity, "time") else 0

            logging.info(
                f"GPX uploaded: {file.filename}, duration: {duration_seconds}s"
            )

            return jsonify(
                {
                    "data": "file uploaded",
                    "filename": file.filename,
                    "duration_seconds": duration_seconds,
                    "has_data": hasattr(activity, "time") and len(activity.time) > 0,
                }
            )
        except Exception as e:
            logging.error(f"Error analyzing GPX file: {e}")
            # Still return success for upload, but without metadata
            return jsonify(
                {
                    "data": "file uploaded",
                    "filename": file.filename,
                    "duration_seconds": 0,
                    "has_data": False,
                    "error": "Could not analyze GPX file",
                }
            )
    return make_response(jsonify({"error": "very bad"}), 400)


def cleanup_old_previews():
    """Remove old preview images to prevent disk space issues"""
    try:
        # Use PUBLIC_DIR
        public_dir = PUBLIC_DIR
        if os.path.exists(public_dir):
            for filename in os.listdir(public_dir):
                if filename.startswith("preview_") and filename.endswith(".png"):
                    filepath = os.path.join(public_dir, filename)
                    try:
                        os.remove(filepath)
                        logging.debug(f"Cleaned up old preview: {filename}")
                    except Exception as e:
                        logging.warning(f"Failed to remove old preview {filename}: {e}")
    except Exception as e:
        logging.warning(f"Error during preview cleanup: {e}")


@app.route("/api/demo", methods=["POST"])
def demo():
    global demo_frame_in_progress

    # Check if a demo is already in progress
    if demo_frame_in_progress:
        logging.warning("Demo frame already in progress, rejecting request")
        return jsonify(
            {"error": "Demo frame generation already in progress", "error_code": "BUSY"}
        ), 429

    data = request.json

    # Log memory usage
    process = psutil.Process()
    mem_before = process.memory_info().rss / 1024 / 1024  # MB
    logging.info(f"Demo endpoint called - Memory before: {mem_before:.1f}MB")

    # Clean up old preview images before generating new one
    cleanup_old_previews()

    # Validation Logic
    if not data:
        logging.error("No JSON data received")
        return jsonify({"error": "No JSON data received"}), 400

    if "config" not in data:
        logging.error("Missing 'config' in request")
        return jsonify({"error": "Missing 'config' in request"}), 400

    if "gpx_filename" not in data:
        logging.error("Missing 'gpx_filename' in request")
        return jsonify({"error": "Missing 'gpx_filename' in request"}), 400

    config = data["config"]
    # Handle both dict and string config (safeJsonStringify sends string via Tauri)
    if isinstance(config, str):
        import json

        try:
            config = json.loads(config)
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse config string: {e}")
            return jsonify({"error": "Invalid config JSON string"}), 400

    if config is None:
        logging.error("Config is None")
        return jsonify({"error": "Config is None"}), 400

    gpx_filename = data["gpx_filename"]
    if gpx_filename is None:
        logging.error("gpx_filename is None")
        return jsonify({"error": "gpx_filename is None"}), 400

    second = data.get("second", 20)  # Default to 20 if not provided
    # Resolve GPX path: prefer uploads dir, fall back to local demo file
    gpx_path = (
        gpx_filename
        if os.path.isabs(gpx_filename)
        else os.path.join(app.config["UPLOAD_FOLDER"], gpx_filename)
    )
    if not os.path.isfile(gpx_path):
        # fallback to bundled demo
        demo_path = os.path.join(BASE_DIR, "demo.gpxinit")
        if os.path.isfile(demo_path):
            gpx_path = demo_path
        else:
            logging.error("GPX file not found: %s", gpx_filename)
            return jsonify({"error": "gpx file not found"}), 400
    # TODO fix this file storage issue w/ frontend demo call
    # config_filename = "tmp/" + data["config_filename"]
    # gpx_filename = "tmp/" + data["gpx_filename"]

    # Set flag to prevent concurrent rendering
    demo_frame_in_progress = True
    try:
        from designer import demo_frame

        scene = demo_frame(
            gpx_path,
            config,
            second,
        )
        logging.info("Demo frame generation completed")
    finally:
        demo_frame_in_progress = False
        # Force garbage collection to free memory
        gc.collect()
        mem_after = process.memory_info().rss / 1024 / 1024  # MB
        logging.info(
            f"Memory after: {mem_after:.1f}MB (delta: {mem_after - mem_before:+.1f}MB)"
        )

    # Check if the result is an error dictionary
    if isinstance(scene, dict) and "error" in scene:
        logging.error(f"Demo frame error: {scene['error']}")
        return jsonify(scene), 400

    if not scene:
        logging.error("Scene is None")
        return jsonify(
            {
                "error": "Failed to generate demo frame",
                "error_code": "UNKNOWN_ERROR",
            }
        ), 500

    if not hasattr(scene, "frames") or len(scene.frames) == 0:
        logging.error("Scene has no frames")
        return jsonify(
            {
                "error": "Failed to generate demo frame - no frames created",
                "error_code": "NO_FRAMES",
            }
        ), 500

    img_filepath = scene.frames[0].full_path()
    logging.info(f"Demo frame generated: {img_filepath}")
    # Use a unique filename with timestamp + uuid to avoid race conditions
    filename = f"preview_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}.png"
    # Use PUBLIC_DIR
    obf_filepath = os.path.join(PUBLIC_DIR, filename)
    try:
        # Use shutil.move instead of os.rename for better cross-filesystem support
        # and check if source exists first
        if not os.path.exists(img_filepath):
            logging.error(f"Demo frame file not found: {img_filepath}")
            return jsonify({"error": "demo frame file not found after generation"}), 500

        if not os.path.exists(PUBLIC_DIR):
            logging.error(f"Destination directory not found: {PUBLIC_DIR}")
            # Create it just in case
            os.makedirs(PUBLIC_DIR, exist_ok=True)

        # Remove destination if it exists to avoid conflicts
        if os.path.exists(obf_filepath):
            os.remove(obf_filepath)

        shutil.move(img_filepath, obf_filepath)
        logging.info(f"Demo frame moved to: {obf_filepath}")
    except Exception as e:
        logging.error(f"Error moving demo frame: {str(e)}")
        return jsonify({"error": f"Error moving file: {str(e)}"}), 500

    return jsonify({"filename": filename})


@app.route("/images/<filename>", methods=["GET"])
def serve_image(filename):
    from flask import send_from_directory

    return send_from_directory(PUBLIC_DIR, filename)


@app.route("/api/open-downloads", methods=["POST"])
def open_downloads():
    """Open the Downloads/Cyclemetry folder in Finder."""
    logging.info("Open downloads requested")
    try:
        downloads_dir = constant.DOWNLOADS_DIR()
        # Ensure it exists before opening
        os.makedirs(downloads_dir, exist_ok=True)
        # Use 'open' command on macOS
        os.system(f'open "{downloads_dir}"')
        return jsonify({"message": "Folder opened"})
    except Exception as e:
        logging.error(f"Error opening folder: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/open-video", methods=["POST"])
def open_video():
    """Open a specific video in the default media player."""
    data = request.json
    if not data or "filename" not in data:
        return jsonify({"error": "filename is required"}), 400

    filename = data["filename"]
    # Check public dir first
    video_path = os.path.join(PUBLIC_DIR, filename)

    # If not in public, check downloads
    if not os.path.exists(video_path):
        video_path = os.path.join(constant.DOWNLOADS_DIR(), filename)

    if not os.path.exists(video_path):
        return jsonify({"error": "Video file not found"}), 404

    try:
        logging.info(f"Opening video: {video_path}")
        os.system(f'open "{video_path}"')
        return jsonify({"message": "Video opened"})
    except Exception as e:
        logging.error(f"Error opening video: {e}")
        return jsonify({"error": str(e)}), 500


def bootboot():
    tmp = "tmp"
    if not os.path.exists(tmp):
        os.makedirs(tmp)

    # with app.app_context():
    #     bootboot()

    tmp = "tmp"
    if not os.path.exists(tmp):
        os.makedirs(tmp)


@app.route("/api/demo-light", methods=["POST"])
def demo_light():
    data = request.get_json()

    config = data.get("config")
    gpx_data = data.get("gpx")

    print("flask demo light")
    print(config)
    print(gpx_data)

    new_filename = f"{int(time.time())}.png"
    # try:
    #     byte_data = base64.b64decode(gpx_data)
    #     scene = None
    # except Exception as e:
    #     logging.error("app.py:demoonlyconfigarg()")
    #     logging.error("issue decoding byte data")
    #     logging.error(e)
    # with tempfile.NamedTemporaryFile(mode="wb") as temp_file:
    #     try:
    #         temp_file.write(byte_data)
    #         temp_file.flush()
    #     except Exception as e:
    #         logging.error("app.py:demoonlyconfigarg()")
    #         logging.error("issue writing temp file")
    #         logging.error(e)

    # TODO: Implement proper demo_frame call when gpx_data is available
    # scene = demo_frame(
    #     temp_file.name, config, 20
    # )  # TODO replace with param for third value - time/second to grab frame
    scene = None  # Placeholder until gpx_data handling is implemented
    if scene is None:
        logging.error("scene is none, scene is fucked")
        # or is it a bad template? to investigate. need to do better error handling
        return jsonify({"error": "likely poorly formatted gpx file"}), 400
    try:
        img_filepath = scene.frames[0].full_path()
        # obf_filepath = f"./frames/{int(time.time())}.png"
        shutil.move(img_filepath, os.path.join(PUBLIC_DIR, new_filename))
    except Exception as e:
        logging.error("app.py:demoonlyconfigarg()")
        logging.error("issue grabbing filename for demo image")
        logging.error(e)

        # os.rename(img_filepath, obf_filepath)
    # return new_filename
    # return full_path

    return jsonify({"filename": new_filename})


@app.route("/api/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return jsonify(
        {"status": "ok", "message": "Backend is running", "ready": backend_ready}
    )


@app.route("/api/render-progress", methods=["GET"])
def render_progress():
    """Get the current video render progress."""
    progress_data = dict(video_render_progress)

    # Calculate estimated time remaining if rendering using smoothed frame rate
    if progress_data["status"] == "rendering" and progress_data["start_time"]:
        elapsed = time.time() - progress_data["start_time"]
        if progress_data["current"] > 0 and elapsed > 0:
            # Use exponential moving average for smoother estimates
            # Keep last 20 samples for moving average
            frame_times = progress_data.get("frame_times", [])
            if len(frame_times) > 0:
                # Calculate average time per frame from recent samples
                avg_time_per_frame = sum(frame_times) / len(frame_times)
                remaining_frames = progress_data["total"] - progress_data["current"]
                estimated_seconds = remaining_frames * avg_time_per_frame
            else:
                # Fallback to simple calculation if no samples yet
                frames_per_second = progress_data["current"] / elapsed
                remaining_frames = progress_data["total"] - progress_data["current"]
                estimated_seconds = (
                    remaining_frames / frames_per_second if frames_per_second > 0 else 0
                )
            progress_data["estimated_seconds_remaining"] = int(estimated_seconds)
        else:
            progress_data["estimated_seconds_remaining"] = None

    # Remove frame_times from response (internal use only)
    progress_data.pop("frame_times", None)

    return jsonify(progress_data)


@app.route("/api/cancel-render", methods=["POST"])
def cancel_render():
    """Cancel the current video rendering."""
    global cancel_render_flag
    cancel_render_flag = True
    video_render_progress["status"] = "cancelled"
    video_render_progress["message"] = "Rendering cancelled by user"
    logging.info("Render cancellation requested")
    return jsonify({"success": True, "message": "Cancellation requested"})


@app.route("/api/render-video", methods=["POST"])
def render_video():
    """
    Render a video overlay from GPX data and config.
    Returns the video file for download.
    """
    data = request.json
    logging.info("render_video endpoint called")

    if not data or "config" not in data or "gpx_filename" not in data:
        logging.error("Invalid request payload")
        return jsonify({"error": "config and gpx_filename are required"}), 400

    config = data["config"]
    # Handle both dict and string config
    if isinstance(config, str):
        import json

        try:
            config = json.loads(config)
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse config string: {e}")
            return jsonify({"error": "Invalid config JSON string"}), 400

    if config is None:
        logging.error("Config is None")
        return jsonify({"error": "Config is None"}), 400

    gpx_filename = data["gpx_filename"]
    if gpx_filename is None:
        logging.error("gpx_filename is None")
        return jsonify({"error": "gpx_filename is None"}), 400

    # Resolve GPX path
    gpx_path = (
        gpx_filename
        if os.path.isabs(gpx_filename)
        else os.path.join(app.config["UPLOAD_FOLDER"], gpx_filename)
    )

    if not os.path.isfile(gpx_path):
        # Fallback to bundled demo
        demo_path = os.path.join(BASE_DIR, "demo.gpxinit")
        if os.path.isfile(demo_path):
            gpx_path = demo_path
        else:
            logging.error("GPX file not found: %s", gpx_filename)
            return jsonify({"error": "gpx file not found"}), 400

    try:
        # Reset progress and cancel flag
        global cancel_render_flag
        cancel_render_flag = False
        video_render_progress["current"] = 0
        video_render_progress["total"] = 0
        video_render_progress["encoded"] = 0  # Track encoding progress
        video_render_progress["status"] = "rendering"
        video_render_progress["message"] = "Initializing..."
        video_render_progress["start_time"] = time.time()
        video_render_progress["frame_times"] = []
        video_render_progress["last_frame_time"] = time.time()

        # Lazy imports for heavy telemetry processing
        from activity import Activity
        from scene import Scene

        # Create activity and scene
        activity = Activity(gpx_path)
        scene = Scene(activity, config)

        # Get start and end from config, with defaults
        start = config.get("scene", {}).get("start", 0)
        end = config.get("scene", {}).get("end", len(activity.time) - 1)

        # Trim and interpolate activity data
        activity.trim(start, end)
        activity.interpolate(scene.fps)

        # Build figures if needed
        scene.build_figures()

        # Calculate total frames
        duration = end - start
        total_frames = duration * scene.fps
        video_render_progress["total"] = total_frames
        video_render_progress["message"] = f"Rendering {total_frames} frames..."

        # Define progress callback with frame time tracking
        def update_progress(current, total, encoded=0):
            now = time.time()
            last_time = video_render_progress.get("last_frame_time", now)
            frame_time = now - last_time

            # Keep a rolling window of the last 20 frame times for smoothing
            frame_times = video_render_progress.get("frame_times", [])
            frame_times.append(frame_time)
            if len(frame_times) > 20:
                frame_times.pop(0)

            video_render_progress["current"] = current
            video_render_progress["total"] = total
            video_render_progress["encoded"] = encoded
            video_render_progress["frame_times"] = frame_times
            video_render_progress["last_frame_time"] = now

        # Define cancel check
        def should_cancel():
            return cancel_render_flag

        # Render the video
        logging.info(f"Rendering video from second {start} to {end}")
        scene.render_video(
            end - start, progress_callback=update_progress, cancel_check=should_cancel
        )

        # Get the output filename from config or use default
        overlay_filename = config.get("scene", {}).get(
            "overlay_filename", "overlay.mov"
        )
        video_path = os.path.join(WRITE_DIR, overlay_filename)

        if not os.path.isfile(video_path):
            logging.error(f"Video file NOT FOUND at expected path: {video_path}")
            # Check if it was created in the current directory as a fallback
            if os.path.isfile(overlay_filename):
                video_path = os.path.abspath(overlay_filename)
                logging.info(f"Fallback: Video found in current dir: {video_path}")
            else:
                return jsonify(
                    {"error": f"Video generation failed - file not found: {video_path}"}
                ), 500

        # Move video to public directory for serving
        timestamp = int(time.time())
        public_filename = f"video_{timestamp}.mov"
        public_path = os.path.join(PUBLIC_DIR, public_filename)

        try:
            logging.info(f"Moving video: {video_path} -> {public_path}")
            shutil.move(video_path, public_path)
        except Exception as e:
            logging.error(f"Failed to move video to public dir: {e}")
            return jsonify({"error": f"Failed to move video: {str(e)}"}), 500

        # Also copy to user's Downloads folder for easy access
        try:
            downloads_dir = constant.DOWNLOADS_DIR()
            os.makedirs(downloads_dir, exist_ok=True)
            downloads_path = os.path.join(downloads_dir, public_filename)
            logging.info(f"Copying to Downloads: {public_path} -> {downloads_path}")
            shutil.copy2(public_path, downloads_path)
        except Exception as e:
            logging.error(f"Failed to copy video to Downloads: {e}")
            import traceback

            logging.error(traceback.format_exc())

        # Mark as complete
        video_render_progress["status"] = "complete"
        video_render_progress["message"] = "Video rendered successfully"
        video_render_progress["current"] = video_render_progress["total"]

        return jsonify(
            {"filename": public_filename, "message": "Video rendered successfully"}
        )

    except Exception as e:
        error_msg = str(e)

        # Check if it was a cancellation
        if "cancelled" in error_msg.lower():
            logging.info("Video rendering was cancelled")
            video_render_progress["status"] = "cancelled"
            video_render_progress["message"] = "Rendering cancelled"
            return jsonify(
                {"error": "Rendering cancelled by user", "cancelled": True}
            ), 400

        logging.error("Error rendering video:")
        logging.error(error_msg)
        import traceback

        traceback.print_exc()

        # Mark as error
        video_render_progress["status"] = "error"
        video_render_progress["message"] = str(e)

        return jsonify({"error": f"video rendering failed: {str(e)}"}), 500


@app.route("/api/templates", methods=["GET"])
def list_templates():
    """List all available templates (bundled and user-saved)."""
    templates = []

    # 1. List bundled templates
    bundled_dir = os.path.join(BASE_DIR, "templates")
    if os.path.exists(bundled_dir):
        for f in os.listdir(bundled_dir):
            if f.endswith(".json"):
                templates.append(
                    {
                        "id": f,
                        "name": f.replace(".json", "").replace("_", " ").title(),
                        "type": "built-in",
                    }
                )

    # 2. List user-saved templates
    user_dir = constant.TEMPLATES_DIR()
    if os.path.exists(user_dir):
        for f in os.listdir(user_dir):
            if f.endswith(".json"):
                # Skip if already in build-in (user overrides)
                exists = next((t for t in templates if t["id"] == f), None)
                if not exists:
                    templates.append(
                        {
                            "id": f,
                            "name": f.replace(".json", "").replace("_", " ").title(),
                            "type": "user",
                        }
                    )

    return jsonify(templates)


@app.route("/api/save-template", methods=["POST"])
def save_template():
    """Save a template config to the user templates directory."""
    data = request.json
    if not data or "config" not in data or "filename" not in data:
        return make_response(jsonify({"error": "Invalid request"}), 400)

    filename = data["filename"]
    if not filename.endswith(".json"):
        filename += ".json"

    config = data["config"]
    user_dir = constant.TEMPLATES_DIR()
    path = os.path.join(user_dir, filename)

    try:
        import json

        with open(path, "w") as f:
            json.dump(config, f, indent=4)
        return jsonify(
            {"message": f"Template saved to {filename}", "filename": filename}
        )
    except Exception as e:
        logging.error(f"Error saving template {filename}: {e}")
        return make_response(jsonify({"error": str(e)}), 500)


@app.route("/api/open-templates", methods=["POST"])
def open_templates():
    """Open the user templates directory in the system file manager."""
    import subprocess

    try:
        user_dir = constant.TEMPLATES_DIR()
        if sys.platform == "darwin":
            subprocess.run(["open", user_dir])
        elif sys.platform == "win32":
            subprocess.run(["explorer", user_dir])
        else:
            subprocess.run(["xdg-open", user_dir])
        return jsonify({"message": "Templates folder opened"})
    except Exception as e:
        logging.error(f"Error opening templates folder: {e}")
        return make_response(jsonify({"error": str(e)}), 500)


def parent_watcher():
    """Monitor the parent process and exit if it dies."""
    import os
    import time
    import psutil

    # Get the parent PID when we start
    parent_pid = os.getppid()
    if parent_pid <= 1:  # Not started by a user process
        return

    logging.info(f"Sidecar monitoring parent PID: {parent_pid}")

    while True:
        try:
            # Check if parent is still running
            parent = psutil.Process(parent_pid)
            if not parent.is_running() or parent.status() == psutil.STATUS_ZOMBIE:
                logging.info("Parent process gone, sidecar exiting...")
                os._exit(0)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            logging.info("Parent process no longer accessible, sidecar exiting...")
            os._exit(0)
        time.sleep(2)


def prewarm_backend():
    """Eagerly load heavy modules in the background to reduce first-preview latency."""
    try:
        logging.info("Pre-warming backend modules...")
        start_warm = time.time()
        # Trigger lazy imports
        from activity import Activity  # noqa: F401
        from scene import Scene  # noqa: F401
        from designer import demo_frame  # noqa: F401

        # Access them to ensure they are fully loaded
        _ = demo_frame

        global backend_ready
        backend_ready = True
        logging.info(f"Backend pre-warmed in {time.time() - start_warm:.2f}s")
    except Exception as e:
        logging.warning(f"Pre-warming encountered an issue (non-fatal): {e}")


if __name__ == "__main__":
    import threading

    # Start parent watcher thread
    watcher_thread = threading.Thread(target=parent_watcher, daemon=True)
    watcher_thread.start()

    # Start pre-warming thread to load heavy libraries in background
    prewarm_thread = threading.Thread(target=prewarm_backend, daemon=True)
    prewarm_thread.start()

    # Check if we should use Unix socket (production) or TCP port (development)
    # Default to socket mode if running as a frozen bundle (sidecar)
    is_frozen = getattr(sys, "frozen", False)
    use_socket = is_frozen or os.getenv("CYCLEMETRY_USE_SOCKET", "").lower() in (
        "1",
        "true",
        "yes",
    )

    if use_socket:
        # Production/Socket mode: Use Unix socket to avoid port conflicts
        socket_path = "/tmp/cyclemetry.sock"

        # Remove stale socket file if it exists
        if os.path.exists(socket_path):
            try:
                os.remove(socket_path)
                logging.info(f"Removed stale socket: {socket_path}")
            except Exception as e:
                logging.error(f"Failed to remove stale socket: {e}")

        logging.info(f"Starting Flask app on unix://{socket_path}")

        from waitress import serve

        serve(app, unix_socket=socket_path, unix_socket_perms="666")
    else:
        # Development/TCP mode: Use TCP port
        logging.info("Starting Flask app on http://localhost:31337")
        app.run(host="0.0.0.0", port=31337, debug=False, use_reloader=False)
