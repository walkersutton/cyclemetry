import useStore from "../store/useStore";
import generateDemoFrame from "./generateDemoFrame";

export default async function saveFile(file) {
  const { setGpxFilename } = useStore.getState();

  console.log("📤 Starting GPX upload:", {
    filename: file.name,
    size: file.size,
    type: file.type,
  });

  try {
    const formData = new FormData();
    formData.append("file", file);

    console.log("📡 Sending request to backend...");
    const response = await fetch("http://localhost:3001/upload", {
      method: "POST",
      // Let the browser set the correct multipart/form-data boundary
      body: formData,
    });

    console.log("📥 Response received:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Upload failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      alert(`Failed to upload GPX file: ${response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log("✅ Upload successful:", result);

    // Update store with filename and duration
    const {
      setDummyDurationSeconds,
      setEndSecond,
      setStartSecond,
      setSelectedSecond,
    } = useStore.getState();

    setGpxFilename(file.name);
    console.log("✅ GPX filename set in store:", file.name);

    // Update duration if available
    if (result.duration_seconds && result.duration_seconds > 0) {
      console.log(
        "✅ Setting activity duration:",
        result.duration_seconds,
        "seconds",
      );
      setDummyDurationSeconds(result.duration_seconds);
      setStartSecond(0);
      setEndSecond(result.duration_seconds);
      setSelectedSecond(0);
    } else {
      console.warn("⚠️ No duration data from backend");
    }

    // Trigger demo generation if we have a config
    const { config, setConfig } = useStore.getState();
    if (config) {
      console.log(
        "✅ Config exists, updating timeline and generating demo frame after GPX upload",
      );

      // Update config with new timeline values
      if (result.duration_seconds && result.duration_seconds > 0) {
        const updatedConfig = {
          ...config,
          scene: {
            ...config.scene,
            start: 0,
            end: result.duration_seconds,
          },
        };
        setConfig(updatedConfig);
      }

      await generateDemoFrame();
    } else {
      console.log("⚠️ No config yet, skipping demo generation");
    }
  } catch (error) {
    console.error("❌ GPX upload error:", {
      message: error.message,
      stack: error.stack,
    });
    alert(`Error uploading GPX file: ${error.message}`);
  }
}
