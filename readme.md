# Cyclemetry - generate GPX video overlays
![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## Features
* Live course tracking
* Live elevation profile
* Cadence, elevation, heartrate, power, speed, etc.
* Supports metric and imperial units

## Templates
* [Safa Brian A](https://github.com/walkersutton/cyclemetry/blob/main/templates/safa_brian_a.json) (featured on readme)

## Setup
```sh
git clone https://github.com/walkersutton/cyclemetry.git
cd cyclemetry
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running
```sh
source venv/bin/activate # if venv not already activated
python main.py <gpx_file> <template_path>
```

## Contributors
* All contributions are welcome
* Feel free to submit your templates for others to use
