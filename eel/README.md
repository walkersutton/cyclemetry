## Dependencies

- python

## running pre-commit hooks

```
(venv) $ pre-commit run --all-files
```

- Make sure pre-commit is installed using pip and/or your activated your virtual environment
- If there were issues on the first call, run command again to see if issues were self-resolved

## How to run dev environment

### start python app

`npm run start:eel`

- you can verify this is working by making a GET request to localhost:8000/eel.js. i.e. `curl localhost:8000/eel.js`
- doesn't seem like it's necessary to do any virtual environment setup??

### start react app

`npm run start:js`
your browser should open to http://localhost:3000/. Check dev tools network tab to make sure the request for `eel.js` has a good response code

## How to build app

TOODO

```
npm run build
```

<!-- - [ffmpeg](https://FFmpeg.org/) # TODO - maybe move this to pip?

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

# run conatiner
docker run -p <host_port>:6969 -td walkersutton/cyclemetry:<tag>
``` -->
