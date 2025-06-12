// function fileToString(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.readAsText(file);
//     reader.onload = () => resolve(reader.result);
//     reader.onerror = (error) => reject(error);
//   });
// }

async function loadGpxFile(gpxFile, handleGpxFilenameStateChange) {
  if (gpxFile) {
    // const fileString = await fileToString(gpxFile);
    let fileName = gpxFile["name"]
    handleGpxFilenameStateChange(fileName);
  } else {
    handleGpxFilenameStateChange(null);
  }
}

export default loadGpxFile;
