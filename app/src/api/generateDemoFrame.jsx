export default async function generateDemoFrame(
  editor,
  gpxFilestring,
  handleGeneratingImageStateChange,
  handleImageFilenameStateChange
) {
  if (!gpxFilestring) {
    console.log("missing gpx file string");
    return;
  }
  if (editor) {
    const config = editor.getValue();
    // if (isEqual(config, initConfig) && gpxFilename === "demo.gpx") {
    //   handleImageFilenameStateChange("demo.png");
    //   return;
    // }
    // we should validate the config - maybe do this in editor, since it's a tigter jump
    // const errors = editor.validate(); -> not sure if this is sufficient - at minimum, should pass required checks of schema
    // const configJson = JSON.stringify(config);
    // TODO - remove this shitty hack of an upload pattern
    // const configFilename = "myconfig.json";
    // const configFile = new File([configJson], configFilename, {
    // type: "application/json",
    // });
    // const postData = new FormData();
    // postData.append("file", configFile);
    // todo replace upload call if need?
    // await axios
    //   .post("/upload", postData, {
    //     headers: {
    //       "Content-Type": "multipart/form-data",
    //     },
    //   })
    //   .then((response) => {
    //     // console.log(response);
    //   })
    //   .catch((error) => {
    //     console.log("generateDemoFrame failed to upload config file");
    //     console.log(error);
    //   });

    handleGeneratingImageStateChange(true);

    // let demoImageFilename = await demoonlyconfigarg(config, gpxFilestring)();

    fetch("http://localhost:3001/api/demo-light", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: config,
        gpx: gpxFilestring,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Server responded with:", data);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });

    let demoImageFilename = "kimg.yo";

    handleGeneratingImageStateChange(false);
    if (demoImageFilename !== null) {
      handleImageFilenameStateChange(demoImageFilename);
    }

    // console.log("new filename is");
    // console.log(newFilename);

    // todo replace demo call must
    //   await axios
    //     .post("/demo", data)
    //     .then((response) => {
    //       handleGeneratingImageStateChange(false);
    //       handleImageFilenameStateChange(response.data.data);
    //     })
    //     .catch((error) => {
    //       handleGeneratingImageStateChange(false);
    //       console.log("generateDemoFrame /demo error");
    //       console.log(error);
    //       alert(error);
    //     });
    // } else {
    //   console.log("BAD BAD BAD generateDemoFrame");
    // }
  }
}
