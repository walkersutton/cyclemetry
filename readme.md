# Cyclemetry - generate GPX video overlays
![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## Features
* Live course tracking
* Live elevation profile
* Cadence, elevation, gradient, heartrate, power, speed, etc.
* Supports imperial and metric units

## Running
```sh
source venv/bin/activate
python main.py <gpx_file> <template_filename>
```
## Templates
* [Safa Brian A](https://github.com/walkersutton/cyclemetry/blob/main/templates/safa_brian_a.json) (featured image on readme (template under development))

### Template Wizard
`python config.py <template_filename>` will launch an interactive CLI program and image preview that can help you modify a template. If you don't specify a `template_filename`, a blank template, `blank_template.json`, will be created that you can modify.
* Templates belong in the `./templates` directory

```
$ python config.py my_template.json
[?] Select attribute to modify: power
   cadence
   course
   elevation
   global
   gradient
   heartrate
 > power
   scene
   speed
   temperature
   time

[?] Select properties to modify:
   [ ] add a property
   [ ] hide
   [ ] suffix
   [X] x
 > [X] y

The current value of x is 0
What value would you like to set it to?
```

## Setup
Tested using `Python 3.11.3` on MacOS Ventura
```sh
git clone https://github.com/walkersutton/cyclemetry.git
cd cyclemetry
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```


## Contributors
* All contributions are welcome
* Feel free to [submit your templates](https://github.com/walkersutton/cyclemetry/pulls) for others to use
