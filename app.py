import os

from flask import Flask, request, jsonify, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename


app = Flask(__name__)
CORS(app)


@app.route("/healthz")
def healthz():
    return "OK", 200
