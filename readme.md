# Cyclemetry - generate GPX video overlays
![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## Features
* Live course tracking
* Live elevation profile
* Cadence, elevation, gradient, heartrate, power, speed, etc.
* Supports imperial and metric units

## Running
```sh
(venv) $ python main.py <gpx_file> <template_filename>
```
## Templates
* [Safa Brian A](https://github.com/walkersutton/cyclemetry/blob/main/templates/safa_brian_a.json) (featured image on readme (template under development))

### Template Wizard
`python config.py <template_filename>` will launch an interactive CLI program and image preview that can help you modify a template. If you don't specify a `template_filename`, a blank template, `blank_template.json`, will be created that you can modify.
* Templates live in the `./templates` directory

```
(venv) $ python config.py
[?] Select attribute to modify: elevation
   *** exit ***
   cadence
   course
 > elevation
   global
   gradient
   heartrate
   power
   scene
   speed
   temperature
   time

[?] Select properties to modify for elevation:
   [ ] add a property
   [ ] hide
 > [X] imperial
   [ ] metric
   [ ] profile

[?] Select properties to modify for imperial elevation:
   [ ] add a property
   [ ] hide
 > [X] suffix
   [ ] x
   [ ] y

Modifying suffix for imperial elevation
Current value:  ft
Enter a new value:
 feet

Modifying suffix for imperial elevation
Current value:  feet
Enter a new value:


[?] Select attribute to modify: *** exit ***
 > *** exit ***
   cadence
   course
   elevation
   global
   gradient
   heartrate
   power
   scene
   speed
   temperature
   time
```

## Setup
Tested using `Python 3.11.3` on MacOS Ventura
```sh
$ git clone https://github.com/walkersutton/cyclemetry.git
$ cd cyclemetry
$ python3 -m venv venv
$ source venv/bin/activate
(venv) $ pip install -r requirements.txt
```
## Alternative Tools
* [DashWare](http://www.dashware.net/) (only available on Windows)
* [Garmin VIRB Edit](https://www.garmin.com/en-US/p/573412)
* [GoPro Telemetry Extractor](https://goprotelemetryextractor.com/) ($150)

## Contributors
* All contributions are welcome
* Feel free to [submit your templates](https://github.com/walkersutton/cyclemetry/pulls) for others to use
