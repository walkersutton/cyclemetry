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
  minimum: 0.0,
  maxiumum: 1.0,
  type: "number",
  description:
    "how opaque the text is. 0 is transparent, 1 is not transparent at all",
};

const labels = {
  type: "array",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const speed = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const cadence = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const time = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const temperature = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const gradient = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const power = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const heartrate = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: true,
    },
  },
};

const elevation = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: false,
    },
    dpi: {
      type: "integer",
      default: 300,
    },
    x: {
      type: "integer",
      default: 0,
    },
    y: {
      type: "integer",
      default: 60,
    },
    profile: {
      type: "object",
      properties: {
        hide: {
          type: "boolean",
          default: false,
        },
        color: {
          type: "string",
          format: "color",
          default: "#f4f4f4",
        },
        dpi: {
          type: "integer",
          default: 300,
        },
        line_width: {
          type: "number",
          default: 2,
        },
        x: {
          type: "integer",
          default: -193,
        },
        y: {
          type: "integer",
          default: 1500,
        },
        width: {
          type: "integer",
          default: 1200,
        },
        height: {
          type: "integer",
          default: 600,
        },
        fill_opacity: {
          type: "number",
          default: 0.6,
        },
        rotation: {
          type: "integer",
          default: 0,
        },
        point_weight: {
          type: "integer",
          default: 14,
        },
        point_label: {
          type: "object",
          properties: {
            color: {
              type: "string",
              format: "color",
              default: "#ffffffc8",
            },
            font: {
              type: "string",
              eenum: "TODO",
              default: "Furore.otf",
            },
            round: {
              type: "integer",
              default: 0,
            },
            x_offset: {
              type: "integer",
              default: 20,
            },
            y_offset: {
              type: "integer",
              default: 20,
            },
            font_size: {
              type: "number",
              default: 12.5,
            },
            units: {
              type: "array",
            },
          },
        },
      },
    },
    point_weight: {
      type: "integer",
      default: 80,
    },
    width: {
      type: "integer",
      default: 270,
    },
    height: {
      type: "integer",
      default: 630,
    },
    color: {
      type: "string",
      default: "#f4f4f4",
    },
    margin: {
      type: "number",
      default: 0.1,
    },
    sub_point: {
      type: "object",
      properties: {
        point_weight: {
          type: "integer",
          default: 345,
        },
        opacity: {
          type: "number",
          default: 0.52,
        },
      },
    },
    rotation: {
      type: "integer",
      default: 150,
    },
  },
};

const course = {
  type: "object",
  required: ["hide"],
  properties: {
    hide: {
      type: "boolean",
      default: false,
    },
    dpi: {
      type: "integer",
      default: 300,
    },
    x: {
      type: "integer",
      default: -30,
    },
    y: {
      type: "integer",
      default: -180,
    },
    line_width: {
      type: "number",
      default: 1.75,
    },
    point_weight: {
      type: "integer",
      default: 80,
    },
    width: {
      type: "integer",
      default: 270,
    },
    height: {
      type: "integer",
      default: 630,
    },
    color: {
      type: "string",
      format: "color",
      default: "#f4f4f4",
    },
    margin: {
      type: "number",
      default: 0.1,
    },
    sub_point: {
      type: "object",
      properties: {
        color: {
          type: "string",
          format: "color",
          default: "#f4f4f4",
        },
        point_weight: {
          type: "integer",
          default: 345,
        },
        opacity: {
          type: "number",
          default: 0.52,
        },
      },
    },
    rotation: {
      type: "integer",
      default: 150,
    },
  },
};

const scene = {
  type: "object",
  required: [],
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
      title: "start",
      default: 0,
      type: "integer",
    },
    end: {
      title: "end",
      default: 100,
      type: "integer",
    },
    // outputFilename: {
    //   title: "Rendered filename",
    //   default: "out.mov",
    //   type: "string",
    //   description: "the filename of the rendered video overlay",
    // },
  },
};

const global = {
  type: "object",
  required: [],
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
    // outputFilename: {
    //   title: "Rendered filename",
    //   default: "out.mov",
    //   type: "string",
    //   description: "the filename of the rendered video overlay",
    // },
  },
};

const base = {
  title: "base values",
  type: "object",
  required: [],
  properties: {
    round: {
      title: "value rounding",
      type: "integer",
      minimum: 0,
      description: "number of decimals to round values to",
    },
    color: {
      title: "global color",
      type: "string",
      format: "color",
      description:
        "font and graph color. can override individual assets with a color object below",
    },
    font: {
      type: "string",
      enum: ["Arial"],
      description: "the font type to render this text in",
    },
    font_size: {
      title: "font size",
      minimum: 1.0,
      type: "number",
    },
    opacity: { ...opacity },
  },
};

let standardText = deepCopy(base);
standardText["title"] = "Standard Text";
standardText["required"].push(...["x", "y"]);
const standardTextExtension = {
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
labelText["required"] = ["text"];
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

let pointLabel = deepCopy(base);
pointLabel["title"] = "point label";
pointLabel["required"].push(...["xOffset", "yOffset"]);
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

const schema = {
  title: "root schema",
  type: "object",
  required: ["scene", "base", "global", "labels"],
  properties: {
    global: global,
    scene: scene,
    base: base,
    standardText: standardText,
    labelText: labelText,
    point: point,
    graph: graph,
    labels: labels,
    course: course,
    elevation: elevation,
    power: power,
    heartrate: heartrate,
    gradient: gradient,
    temperature: temperature,
    time: time,
    cadence: cadence,
    speed: speed,
  },
};

export default schema;
