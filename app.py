import os
import time
import uuid

from flask import Flask, request, jsonify, redirect, url_for, make_response, abort, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from designer import demo_frame


def gen_file_identifier():
    return f"{uuid.uuid4()}{int(time.time())}"


ALLOWED_EXTENSIONS = {"json", "gpx"}
UPLOAD_FOLDER = "./tmp"

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


file_map = {}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.errorhandler(406)
def bad_request(error):
    return make_response(
        jsonify({"error": "Bad Request sowwy - " + error.description}), 406
    )


@app.route("/healthz")
def healthz():
    return "OK", 200


@app.route("/upload", methods=["POST"])
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
        id = gen_file_identifier()
        file_map[id] = path
        return jsonify({"data": id})
    return make_response(jsonify({"error": "very bad"}), 400)


@app.route("/demo", methods=["POST"])
def demo():

    data = request.json

    if (
        data
        and "config_id" in data
        and "gpx_id" in data
        and data["config_id"] is not None
        and data["gpx_id"] is not None
    ):
        print("seemingly okay???")
        config_id = data['config_id']
        gpx_id = data['gpx_id']
        config_filename = file_map[config_id]
        # config_filename = "safa_brian_a_4k.json"
        gpx_filename = file_map[gpx_id]

        print(config_filename, gpx_filename)
        scene = demo_frame(
            gpx_filename, config_filename, 20
        )  # TODO replace with param for second value
        img_filepath = scene.frames[0].full_path()

        print(img_filepath)

        # something like ./frames/00600.png

        id = gen_file_identifier()
        file_map[id] = os.path.basename(img_filepath)
        # kscene.update_configs(template_filename)
    return jsonify({"data": id})

@app.route('/images/<file_id>')
def serve_image(file_id):
    filename = file_map[file_id]
    # safe_path = safe_join('frames', filename)
    return send_from_directory('frames', filename)