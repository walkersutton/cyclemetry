// {"
// designer types
// * point_label, course, elevation, sub_point, imperial, metric, time, scene -> object
// * labels -> list[dict
//     ]
// * units -> list[str
//     ]
// * dpi, x, y, width, height, rotation, x_offset, y_offset, round, fps -> int
// * line_width, point_weight, margin, opacity, fill_opacity, font_size -> number
// * color -> string(hex or ______)
// * suffix, output_filename, text -> str
// * quicktime_compatible -> true
// ": ""}

//     "unit_text": { // speed, temperature - should this be list of objects or key value pair? - i don't think matters too much? -  for some reason, i thought list earlier
//         "imperial": {
//             "required": false,
//             "type": "standard_text"
//         },
//         "metric": {
//             "required": false,
//             "type": "standard_text"
//         }
//     },

function deepCopy(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    const arrCopy = [];
    obj.forEach((item, index) => {
      arrCopy[index] = deepCopy(item);
    });
    return arrCopy;
  }

  const objCopy = {};
  Object.keys(obj).forEach((key) => {
    objCopy[key] = deepCopy(obj[key]);
  });

  return objCopy;
}
const opacity = {
  default: 1.0,
  minimum: 0.0,
  maxiumum: 1.0,
  type: "number",
  description:
    "how opaque the text is. 0 is transparent, 1 is not transparent at all",
};
const scene = {
  title: "Scene",
  description: "TODO description",
  type: "object",
  required: ["fps", "height", "width"],
  // for demo purposes, fps doesn't reallllly matter, but it's required to generate frame, so maybe we should think about setting a defualt fps so that people don't have to worry about it when generating demo stills
  defaultProperties: ["fps", "height", "width"],
  properties: {
    fps: {
      type: "integer",
      default: 30,
      minimum: 1,
      description: "# of frames / second to render video overlay with",
    },
    height: {
      type: "integer",
      default: 1080,
      minimum: 1,
      description: "height in pixels of rendered video overlay",
    },
    width: {
      type: "integer",
      default: 1920,
      minimum: 1,
      description: "width in pixels of rendered video overlay",
    },
    quicktimeCompatible: {
      title: "QuickTime compatible",
      default: true,
      type: "string",
      enum: ["yes", "no"],
      description:
        "whether or not ffmpeg should render a video using a codec** that is compatible with quicktime player on mac",
    },
    start: {
      type: "integer",
      default: 0,
      minimum: 0,
      description: "second to start render from (affects plots for demo)",
    },
    end: {
      type: "integer",
      default: 60,
      minimum: 0,
      description: "second to end render from (affects plots for demo)",
    },
    // outputFilename: {
    //   title: "Rendered filename",
    //   default: "out.mov",
    //   type: "string",
    //   description: "the filename of the rendered video overlay",
    // },
  },
};

const base = {
  title: "base",
  type: "object",
  required: [],
  defaultProperties: [],
  properties: {
    round: {
      type: "integer",
      minimum: 0,
      description: "number of decimals to round values to",
    },
    color: {
      type: "string",
      format: "color",
      description:
        "font and graph color. can override individual assets with a color object below",
    },
    font: {
      type: "string",
      enum: ["Arial", "Evogria.otf"],
      description: "the font type to render this text in",
    },
    font_size: {
      default: 12,
      title: "font size",
      minimum: 1.0,
      type: "number",
    },
    opacity: { ...opacity },
  },
};

let standardText = deepCopy(base);
standardText["title"] = "Standard Text";
standardText["required"].push(...["x", "y", "font_size", "font"]);
standardText["defaultProperties"].push(...["x", "y", "font_size", "font"]);
const standardTextExtension = {
  // probbaly can abstract out x/y to a position object and .. into the dict
  x: {
    type: "integer",
    default: 0,
    descripiton: "x coordinate of this value ((0,0) is top left)",
  },
  y: {
    type: "integer",
    default: 0,
    descripiton: "y coordinate of this value ((0,0) is top left)",
  },
  suffix: {
    type: "string",
    description: "text appended to the string value",
  },
};
standardText["properties"] = {
  ...standardText["properties"],
  ...standardTextExtension,
};

let labelText = deepCopy(standardText);
labelText["title"] = "Label Text";
labelText["required"].push(...["text"]);
labelText["defaultProperties"].push(...["text"]);
const labelTextExtension = {
  text: {
    type: "string",
    description: "the text content of the label",
  },
};
labelText["properties"] = {
  ...labelText["properties"],
  ...labelTextExtension,
};

let valueText = deepCopy(standardText);
valueText["title"] = "Value Text";
valueText["required"].push(...["value"]);
valueText["defaultProperties"].push(...["value"]);
const valueTextExtension = {
  value: {
    type: "string",
    enum: ["cadence", "power", "speed"], // NICEITY- inspect gpx to define this enum so that only valid enums are able to be selected
  },
};
valueText["properties"] = {
  ...valueText["properties"],
  ...valueTextExtension,
};

let pointLabel = deepCopy(base);
pointLabel["title"] = "point label";
pointLabel["required"].push(...["xOffset", "yOffset"]);
pointLabel["defaultProperties"].push(...["xOffset", "yOffset"]);
const pointLabelExtension = {
  xOffset: {
    default: 20,
    type: "integer",
    description:
      "number of pixels to pad**(?) the value with on the left/right",
  },
  yOffset: {
    default: 20,
    type: "integer",
    description:
      "number of pixels to pad**(?) the value with on the top/bottom",
  },
};
pointLabel["properties"] = {
  ...pointLabel["properties"],
  ...pointLabelExtension,
};

const point = {
  type: "object",
  required: [],
  defaultProperties: [],
  properties: {
    weight: {
      minimum: 0,
      type: "integer",
      description: "the diameter of points drawn on the graph",
    },
    color: {
      type: "string",
      format: "color",
      description:
        "font and graph color. can override individual assets with a color object below",
    },
    opacity: { ...opacity },
    label: pointLabel,
    //   "units TODO - this needs to be cleaned up - or improve configurability": [
    //     "metric",
    //     "imperial",
    //   ],
  },
};

const graph = {
  type: "object",
  required: [],
  defaultProperties: [],
  properties: {
    dpi: {
      default: 300,
      type: "integer",
      description: "pixel density of generated graphic",
    },
    x: {
      //   required: true,
      type: "integer",
      descripiton: "x coordinate of this graph ((0,0) is top left)",
    },
    y: {
      //   required: true,
      type: "integer",
      descripiton: "y coordinate of this graph ((0,0) is top left)",
    },
    width: {
      //   required: true,
      type: "integer",
      minimum: 0,
      description: "width in pixels of graphic",
    },
    height: {
      //   required: true,
      type: "integer",
      minimum: 0,
      description: "height in pixels of graphic",
    },
    color: {
      type: "string",
      format: "color",
      description: "graph color",
    },
    line: {
      type: "object",
      required: [],
      properties: {
        width: {
          default: 1.75,
          type: "number",
          description: "thickness of lines drawn",
        },
        opacity: { ...opacity },
      },
    },
    underFillOpacity: { ...opacity },
    primaryPoint: deepCopy(point),
    subPoint: deepCopy(point),
    margin: {
      required: false,
      type: "number",
      description: "amount of marign surrounding graphic",
    },
    rotation: {
      required: false,
      type: "int",
      maxiumum: 359,
      description: "numeber of degrees to rotate graphic",
    },
  },
};

const values = {
  type: "array",
  items: valueText,
  title: "Values",
};

const labels = {
  type: "array",
  title: "Labels",
  items: labelText,
};

global = deepCopy(base);
global["title"] = "Globals";
global["required"] = ["color"];
global["defaultProperties"] = ["color"];

const schema = {
  title: "hidden using css",
  type: "object",
  required: ["scene"],
  properties: {
    scene: scene,
    global: global,
    // standardText: standardText,
    // labelText: labelText,
    // point: point,
    // graph: graph,
    labels: labels,
    values: values,
  },
};

export default schema;
