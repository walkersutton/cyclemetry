## Dependencies

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
(venv) $ flask run
```

# CLI

```sh
(venv) $ python main.py <gpx_file> <template_filename>
```

I need to make Cyclemetry a bit easier to use. [Here's a video](https://youtu.be/gqn5MfcypH4) where I explain how I use the tool. I'm building a [web app](https://walkersutton.com/cyclemetry/) that'll enable you to use a GUI to generate your video overlays.

# Docker

```
#
docker ps -a

# build image
docker build . -t walkersutton/cyclemetry:<tag>
docker build --platform linux/amd64 . -t walkersutton/cyclemetry:<tag> # pattern linuxamd64-suffix

# push image to docker hub
docker push walkersutton/cyclemetry:<tag>

# run conatiner
docker run -p <host_port>:6969 -td walkersutton/cyclemetry:<tag>
```
