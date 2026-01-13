import gc
import math
import os
from subprocess import PIPE, Popen
import logging

import constant

# Lazy imports for:
# from frame import Frame
# from plot import build_figure
# from template import build_configs


class Scene:
    def __init__(self, activity, template):
        self.activity = activity
        self.template = template
        self.fps = self.template["scene"]["fps"]
        if "labels" in self.template.keys():
            self.labels = self.template["labels"]
        else:
            self.labels = []
        self.frames = []

    def render_video(self, seconds, progress_callback=None, cancel_check=None):
        self.build_frames(seconds)
        self.export_video(progress_callback, cancel_check)

    def render_demo(self, seconds, second):
        import matplotlib.pyplot as plt

        try:
            self.build_frame(seconds, second, 0)
            self.draw_frames()
        finally:
            # Always close all matplotlib figures to prevent memory leaks
            plt.close("all")
            # Clear any figure references
            if hasattr(self, "figs") and self.figs:
                for fig in self.figs:
                    plt.close(fig)
                self.figs = None

    def update_configs(self, config_filename):
        from template import build_configs

        self.template = build_configs(config_filename)

    def draw_frames(self):
        if not os.path.exists(constant.FRAMES_DIR()):
            os.makedirs(constant.FRAMES_DIR())
        if not hasattr(self, "figs"):
            self.figs = None
        for frame in self.frames:
            frame.draw(self.template, self.figs).save(frame.full_path())

    def build_figures(self):
        def figure_data(attribute):
            x, y = None, None
            match attribute:
                case constant.ATTR_COURSE:
                    x = [ele[1] for ele in self.activity.course]
                    y = [ele[0] for ele in self.activity.course]
                case constant.ATTR_ELEVATION:
                    x = [ii for ii in range(len(self.activity.elevation))]
                    y = self.activity.elevation
                case _:
                    raise ValueError(f"Unknown attribute: {attribute}")
            return x, y

        if "plots" in self.template.keys():
            from plot import build_figure

            self.figs = {}
            for config in self.template["plots"]:
                x, y = figure_data(config["value"])
                self.figs[config["value"]] = build_figure(config, x, y)

    def export_video(self, progress_callback=None, cancel_check=None):
        overlay_filename = (
            self.template["scene"]["overlay_filename"]
            if "overlay_filename" in self.template["scene"].keys()
            else constant.DEFAULT_OVERLAY_FILENAME
        )
        if not os.path.isabs(overlay_filename):
            overlay_filename = os.path.join(constant.WRITE_DIR(), overlay_filename)
        width, height = (
            self.template["scene"]["width"],
            self.template["scene"]["height"],
        )

        # Ensure dimensions are even (required by most codecs including ProRes)
        if width % 2 != 0:
            width += 1
        if height % 2 != 0:
            height += 1

        # Pre-render static elements once (labels and static plot backgrounds)
        # This avoids redrawing them for every frame
        from PIL import Image

        base_image = Image.new("RGBA", (width, height))

        # Cache static labels
        if "labels" in self.template.keys():
            for config in self.template["labels"]:
                # Draw static labels onto base image
                if len(self.frames) > 0:
                    base_image = self.frames[0].draw_value(
                        base_image,
                        config["text"],
                        config,
                        self.template.get("scene", {}),
                    )

        # Cache static plot backgrounds (without position markers)
        # Position markers will be drawn per-frame
        plot_backgrounds = {}
        if "plots" in self.template.keys() and hasattr(self, "figs"):
            for config in self.template["plots"]:
                attribute = config["value"]
                if attribute in self.figs:
                    # Check if this plot has dynamic position markers (points)
                    has_position_markers = (
                        "points" in config and len(config.get("points", [])) > 0
                    )

                    if not has_position_markers:
                        # Static plot - cache it on base image
                        if len(self.frames) > 0:
                            base_image = self.frames[0].draw_figure(
                                base_image,
                                config,
                                attribute,
                                self.figs[attribute],
                                fps=self.fps,
                            )
                    else:
                        # Dynamic plot - cache the background separately
                        # We'll draw position markers per-frame
                        plot_bg = Image.new("RGBA", (width, height))
                        if len(self.frames) > 0:
                            # Draw the plot without position markers
                            config_without_points = {**config, "points": []}
                            plot_bg = self.frames[0].draw_figure(
                                plot_bg,
                                config_without_points,
                                attribute,
                                self.figs[attribute],
                                fps=self.fps,
                            )
                        plot_backgrounds[attribute] = (plot_bg, config)

        # FFmpeg command to encode video from raw frames
        # Input parameters (must come before -i)
        framerate = ["-r", str(self.fps)]
        fmt = ["-f", "rawvideo"]
        pixel_format_in = ["-pix_fmt", "rgba"]
        size = ["-s", f"{width}x{height}"]

        # Output parameters
        codec = ["-c:v", "prores_ks"]  # helps with transparency
        pixel_format_out = ["-pix_fmt", "yuva444p10le"]  # Required for ProRes + Alpha
        output = ["-y", overlay_filename]

        import sys

        # Resolve ffmpeg path - use bundled binary if frozen (PyInstaller)
        ffmpeg_bin = "ffmpeg"
        if getattr(sys, "frozen", False):
            ffmpeg_bin = os.path.join(sys._MEIPASS, "ffmpeg")
            logging.info(f"Using bundled ffmpeg: {ffmpeg_bin}")

        ffmpeg_cmd = (
            [ffmpeg_bin]
            + ["-loglevel", "info"]  # Show more info for debugging
            + fmt
            + size
            + pixel_format_in
            + framerate
            + ["-i", "-"]
            + codec
            + pixel_format_out
            + output
        )

        logging.info(
            f"Starting ffmpeg with dimensions {width}x{height} and command: {' '.join(ffmpeg_cmd)}"
        )

        # Add common paths for Homebrew and macOS
        env = os.environ.copy()
        extra_paths = [
            "/opt/homebrew/bin",  # Apple Silicon Homebrew
            "/usr/local/bin",  # Intel Homebrew
            "/usr/bin",
            "/bin",
        ]
        env["PATH"] = ":".join(extra_paths) + ":" + env.get("PATH", "")

        try:
            p = Popen(ffmpeg_cmd, stdin=PIPE, stderr=PIPE, stdout=PIPE, env=env)
        except Exception as e:
            logging.error(f"Failed to start ffmpeg process: {e}")
            raise Exception(f"Could not start ffmpeg: {str(e)}")
        # Threaded monitoring of ffmpeg stderr to track progress and prevent deadlocks
        import threading
        import re

        encoded_frames = 0
        io_lock = threading.Lock()

        def monitor_ffmpeg(process):
            nonlocal encoded_frames

            # Regex to find "frame= 123"
            frame_pattern = re.compile(r"frame=\s*(\d+)")

            while True:
                line = process.stderr.readline()
                if not line:
                    break

                line_str = line.decode("utf-8", errors="replace")

                # Update progress
                match = frame_pattern.search(line_str)
                if match:
                    with io_lock:
                        encoded_frames = int(match.group(1))

                # Log only errors or warnings, avoid spamming info
                if "error" in line_str.lower() or "warning" in line_str.lower():
                    logging.info(f"ffmpeg: {line_str.strip()}")

        monitor_thread = threading.Thread(target=monitor_ffmpeg, args=(p,), daemon=True)
        monitor_thread.start()

        # Sequential rendering - memory efficient, no multiprocessing overhead
        logging.info(f"Rendering {len(self.frames)} frames sequentially")

        for idx, frame in enumerate(self.frames):
            # Check for cancellation
            if cancel_check and cancel_check():
                logging.info("Rendering cancelled by user")
                p.stdin.close()
                p.terminate()
                p.wait()
                if os.path.exists(overlay_filename):
                    os.remove(overlay_filename)
                raise Exception("Rendering cancelled by user")

            # Check if ffmpeg is still alive
            if p.poll() is not None:
                # Capture any remaining output
                monitor_thread.join(timeout=1)
                # stderr_output = "See logs above"
                logging.error(f"ffmpeg process died unexpectedly at frame {idx}")
                raise Exception(f"ffmpeg died (exit {p.returncode})")

            # Render frame and pipe directly to ffmpeg
            try:
                image = frame.draw(
                    self.template, self.figs, base_image, plot_backgrounds
                )
                p.stdin.write(image.tobytes())
            except BrokenPipeError:
                logging.error("Broken pipe when writing to ffmpeg")
                raise Exception("ffmpeg pipe broken - video encoding failed")

            # Progress callback
            if progress_callback:
                current_enc = 0
                with io_lock:
                    current_enc = encoded_frames

                # Pass both generation progress and encoding progress
                # Callback signature: (current_gen, total_gen, current_enc)
                try:
                    progress_callback(idx + 1, len(self.frames), current_enc)
                except TypeError:
                    # Fallback for old signature
                    progress_callback(idx + 1, len(self.frames))

            # Force garbage collection every 30 frames to manage memory
            if (idx + 1) % 30 == 0:
                gc.collect()

        # Close stdin to signal EOF to ffmpeg
        p.stdin.close()

        # Wait for ffmpeg to finish
        p.wait()
        monitor_thread.join()
        return_code = p.returncode

        # Check if ffmpeg succeeded
        if return_code != 0:
            logging.error(f"ffmpeg failed with exit code {return_code}")
            raise Exception(f"ffmpeg encoding failed (exit {return_code})")

        logging.info(f"ffmpeg completed successfully, output: {overlay_filename}")

        # TODO - try to not depend on ffmpeg subprocess call please
        # clips = [
        #     ImageClip(frame.filename, transparent=True).set_duration(frame_duration)
        #     for frame in self.frames
        # ]
        # concatenate_videoclips(clips, method="compose").write_videofile(
        #     export_filename,
        #     codec="mpeg4",
        #     ffmpeg_params=["-pix_fmt", "yuv420p"],
        #     fps=config["fps"],
        # )

    def frame_attribute_data(self, second: int, frame_number: int):
        attribute_data = {}
        valid_attributes = self.activity.valid_attributes
        for attribute in valid_attributes:
            if attribute in constant.NO_INTERPOLATE_ATTRIBUTES:
                attribute_data[attribute] = getattr(self.activity, attribute)[second]
            else:
                attribute_data[attribute] = getattr(self.activity, attribute)[
                    second * self.fps + frame_number
                ]
        return attribute_data

    def build_frame(self, seconds, second, frame_number):
        num_frames = seconds * self.fps
        frame_digits = int(math.log10(num_frames - 2)) + 1
        from frame import Frame

        frame = Frame(
            f"{str(second * self.fps + frame_number).zfill(frame_digits)}.png",
            self.template["scene"]["width"],
            self.template["scene"]["height"],
            second,
            frame_number,
        )
        valid_attributes = self.activity.valid_attributes
        frame.valid_attributes = valid_attributes
        # frame.labels = self.labels
        frame_data = self.frame_attribute_data(second, frame_number)
        for attribute in frame.valid_attributes:
            setattr(frame, attribute, frame_data[attribute])
        self.frames.append(frame)

    def build_frames(self, seconds):
        for second in range(seconds):
            for frame_number in range(self.fps):
                self.build_frame(seconds, second, frame_number)
