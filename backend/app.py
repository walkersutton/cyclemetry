import gc
import logging
import os
import psutil
import shutil
import time
import uuid
import sys
import tempfile
import os

# Set up file logging immediately
log_file = os.path.join(tempfile.gettempdir(), "cyclemetry-backend.log")
sys.stderr = open(log_file, "w", buffering=1)
sys.stdout = sys.stderr

print("DEBUG: app.py starting imports...", flush=True)

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

print("DEBUG: flask imported", flush=True)

from activity import Activity
print("DEBUG: Activity imported", flush=True)

from designer import demo_frame
print("DEBUG: designer imported", flush=True)

from scene import Scene
print("DEBUG: Scene imported", flush=True)

# Use extension names without leading dots

# Use extension names without leading dots
ALLOWED_EXTENSIONS = {"gpx", "js", "html", "jpg", "png", "mov"}
# Global variable to track video render progress
video_render_progress = {
    "current": 0,
    "total": 0,
    "status": "idle",  # idle, rendering, complete, error, cancelled
    "message": "",
    "start_time": None,
    "frame_times": [],  # Track recent frame times for smoothing
}

# Global flag to cancel rendering
cancel_render_flag = False

# Flag to prevent concurrent demo frame generation (prevents OOM)
demo_frame_in_progress = False

logging.basicConfig(level=logging.INFO)

import sys
import tempfile

app = Flask(__name__)

# Configure directories
if getattr(sys, 'frozen', False):
    # Running as compiled PyInstaller bundle
    BASE_DIR = sys._MEIPASS
    # Use system temp dir for write operations
    WRITE_DIR = os.path.join(tempfile.gettempdir(), "cyclemetry")
else:
    # Running from source
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    WRITE_DIR = os.path.join(BASE_DIR, "tmp")

os.makedirs(WRITE_DIR, exist_ok=True)
UPLOAD_DIR = os.path.join(WRITE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
PUBLIC_DIR = os.path.join(WRITE_DIR, "public")
os.makedirs(PUBLIC_DIR, exist_ok=True)

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
    if (
        data
        and "config" in data
        and "gpx_filename" in data
        and data["config"] is not None
        and data["gpx_filename"] is not None
    ):
        config = data["config"]
        gpx_filename = data["gpx_filename"]
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
                return jsonify(
                    {"error": "demo frame file not found after generation"}
                ), 500

            if not os.path.exists(dest_dir):
                logging.error(f"Destination directory not found: {dest_dir}")
                # Create it just in case
                os.makedirs(dest_dir, exist_ok=True)

            # Remove destination if it exists to avoid conflicts
            if os.path.exists(obf_filepath):
                os.remove(obf_filepath)

            shutil.move(img_filepath, obf_filepath)
            logging.info(f"Demo frame moved to: {obf_filepath}")
        except Exception as e:
            logging.error(f"Error moving demo frame: {str(e)}")
            return jsonify({"error": f"Error moving file: {str(e)}"}), 400
        # filename = os.path.basename(obf_filepath)
    else:
        logging.error("Demo request validation failed")
        return jsonify({"error": "invalid request payload"}), 400
    return jsonify({"filename": filename})


@app.route("/images/<filename>", methods=["GET"])
def serve_image(filename):
    from flask import send_from_directory
    return send_from_directory(PUBLIC_DIR, filename)


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
    return jsonify({"status": "ok", "message": "Backend is running"})


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
    gpx_filename = data["gpx_filename"]

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
        video_render_progress["status"] = "rendering"
        video_render_progress["message"] = "Initializing..."
        video_render_progress["start_time"] = time.time()
        video_render_progress["frame_times"] = []
        video_render_progress["last_frame_time"] = time.time()

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
        def update_progress(current, total):
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
        video_path = os.path.join(BASE_DIR, overlay_filename)

        if not os.path.isfile(video_path):
            logging.error("Video file was not created: %s", video_path)
            return jsonify({"error": "video rendering failed"}), 500

        # Move video to public directory for serving
        timestamp = int(time.time())
        public_filename = f"video_{timestamp}.mov"
        public_path = os.path.join(PUBLIC_DIR, public_filename)

        shutil.move(video_path, public_path)
        logging.info(f"Video saved to: {public_path}")

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


if __name__ == "__main__":
    print("DEBUG: Entering main block", file=sys.stderr)
    sys.stderr.flush()
    # Allow running directly via `uv run app.py`
    # Note: debug=False in Docker to prevent reloader issues (exit code 247)
    # Use FLASK_DEBUG=1 env var for development logging without reloader
    logging.info("Starting Flask app on http://localhost:3001")
    app.run(host="0.0.0.0", port=3001, debug=False, use_reloader=False)
