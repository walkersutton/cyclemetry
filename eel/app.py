import base64
import logging
import os
import shutil
import sys
import tempfile
import time

from designer import demo_frame_v2

import eel

logging.basicConfig(level=logging.INFO)

# app = Flask(__name__)
# CORS(
#     app,
#     origins=[f"http://localhost:3000", "https://walkersutton.com"],
# )

# app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# @app.errorhandler(406)
def bad_request(error):
    return make_response(
        jsonify({"error": "Bad Request sowwy - " + error.description}), 406
    )


# @app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return make_response(jsonify({"error": "invalid request"}), 400)
    file = request.files["file"]
    if file.filename == "":
        return make_response(jsonify({"error": "no file selected"}), 400)
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(path)
        return jsonify({"data": "file uploaded"})
    return make_response(jsonify({"error": "very bad"}), 400)


# @app.route("/demo", methods=["POST"])
def demo():
    data = request.json
    if (
        data
        and "config_filename" in data
        and "gpx_filename" in data
        and data["config_filename"] is not None
        and data["gpx_filename"] is not None
    ):
        logging.info("app.py:demo() validated request")
        logging.info(data)
        config_filename = data["config_filename"]
        gpx_filename = data["gpx_filename"]
        # TODO fix this file storage issue w/ frontend demo call
        # config_filename = "tmp/" + data["config_filename"]
        # gpx_filename = "tmp/" + data["gpx_filename"]

        scene = demo_frame(
            gpx_filename, config_filename, 20, True
        )  # TODO replace with param for third value

        img_filepath = scene.frames[0].full_path()
        obf_filepath = f"./frames/{int(time.time())}.png"
        try:
            os.rename(img_filepath, obf_filepath)
        except Exception as e:
            logging.error("app.py:demo()")
            logging.error(e)
            logging.error(data)
        filename = os.path.basename(obf_filepath)
    else:
        logging.error("app.py:demo() failed validation")
        logging.error(data)
    return jsonify({"data": filename})


# @app.route("/images/<filename>", methods=["GET"])
def serve_image(filename):
    # TODO images are never deleted! need to clean eventually . maybe some sort of daily job to keep things TIDY
    return send_from_directory("frames", filename)


def bootboot():
    tmp = "tmp"
    if not os.path.exists(tmp):
        os.makedirs(tmp)

    # with app.app_context():
    #     bootboot()

    tmp = "tmp"
    if not os.path.exists(tmp):
        os.makedirs(tmp)


@eel.expose
def hello():
    print("hello - python function")


@eel.expose
def demoonlyconfigarg(config, gpx_data):
    new_filename = f"{int(time.time())}.png"
    try:
        byte_data = base64.b64decode(gpx_data)
        scene = None
    except Exception as e:
        logging.error("app.py:demoonlyconfigarg()")
        logging.error("issue decoding byte data")
        logging.error(e)
    with tempfile.NamedTemporaryFile(mode="wb") as temp_file:
        try:
            temp_file.write(byte_data)
            temp_file.flush()
        except Exception as e:
            logging.error("app.py:demoonlyconfigarg()")
            logging.error("issue writing temp file")
            logging.error(e)

        scene = demo_frame_v2(
            temp_file.name, config, 20
        )  # TODO replace with param for third value - time/second to grab frame
        if scene == None:
            logging.error("scene is none, scene is fucked")
            return
        try:
            img_filepath = scene.frames[0].full_path()
            # obf_filepath = f"./frames/{int(time.time())}.png"
            shutil.move(img_filepath, f"./public/{new_filename}")
        except Exception as e:
            logging.error("app.py:demoonlyconfigarg()")
            logging.error("issue grabbing filename for demo image")
            logging.error(e)

        # os.rename(img_filepath, obf_filepath)
    return new_filename
    # filename = os.path.basename(obf_filepath)

    # return jsonify({"data": filename})


if __name__ == "__main__":
    if sys.argv[1] == "--develop":
        logging.info("develop flag seen")
        # eel.init('client')
        # eel.start()
        # eel.start('index.html')
        # eel.start({"port": 3000})
        # eel.init('public')
        # eel.start('index.html')
        eel.init("build")
        eel.start()
    else:
        eel.init("build")
        eel.start("index.html")

    #

    # eel.init('client')
    # eel.start({"port": 3000}, host="localhost", port=8080)
    # eel.init('build')
    # eel.start('index.html')

    # eel.init('client')
    # eel.start({"port": 3000}, host="localhost", port=8080)
    # eel.start('index.html')
    # # eel.start({"port": 3000})
    # eel.start('index.html')
