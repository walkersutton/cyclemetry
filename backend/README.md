# backend

TODO
- do we need docs for running backend server independently?
- will prioritize this if move away from docker compose


<!--

TODO clean

----------


## Dependencies

- python

## new notes

```python

* uv run ruff check

# run flask server
uv run -- flask run -p 3001
ORRrrrr.. uv run -- flask --app app:app run -p 3001

```
----------

- [ffmpeg](https://FFmpeg.org/) # TODO - maybe move this to pip?

# Run Flask server locally

Tested using Python 3.11.4 and 3.11.6 on MacOS Ventura and MacOS Sonoma

**Not working on Python 3.12.0 (distutils dependency issue)**

```sh
$ git clone https://github.com/walkersutton/cyclemetry.git
$ cd cyclemetry/backend
$ python3 -m venv venv
$ source venv/bin/activate
(venv) $ pip install -r requirements.txt
(venv) $ flask run -p 5001
```

# CLI

```sh
(venv) $ python main.py demo -gpx <gpx_file> -template <template_filename> -second <time to render demo frame>
(venv) $ python main.py render -gpx <gpx_file> -template <template_filename>
```

I need to make Cyclemetry a bit easier to use. [Here's a video](https://youtu.be/gqn5MfcypH4) where I explain how I use the tool. I'm building a [web app](https://walkersutton.com/cyclemetry/) that'll enable you to use a GUI to generate your video overlays.

# [Docker](https://hub.docker.com/repository/docker/walkersutton/cyclemetry/general)

```
#
docker ps -a

# build image
docker build . -t walkersutton/cyclemetry:<tag>
# i.e. "docker build . -t walkersutton/cyclemetry:alpha-v2"
docker build --platform linux/amd64 . -t walkersutton/cyclemetry:<tag> # pattern linuxamd64-prefix
# i.e. "docker build --platform linux/amd64 . -t walkersutton/cyclemetry:linuxamd64-alpha-v2"

# push image to docker hub
docker push walkersutton/cyclemetry:<tag>

# run container
docker run -p <host_port>:6969 -td walkersutton/cyclemetry:<tag>
``` -->
