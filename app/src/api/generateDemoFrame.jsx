import useStore from "../store/useStore";

// Track if a request is in progress to prevent duplicate calls
let isGenerating = false;
let pendingRequest = null;

export default async function generateDemoFrame(config) {
  try {
    const {
      gpxFilename,
      setImageFilename,
      setGeneratingImage,
      config: storeConfig,
      selectedSecond,
    } = useStore.getState();

    const configToSend = config ?? storeConfig;

    // Validate we have required data
    if (!configToSend || !configToSend.scene) {
      console.error("No valid config available");
      return;
    }

    if (!gpxFilename) {
      console.error("No GPX file selected");
      throw new Error(
        "Please load a GPX file first. Click 'Load Demo Activity' or upload your own GPX file.",
      );
    }

    // If already generating, cancel the pending request and start a new one
    if (isGenerating && pendingRequest) {
      console.log("Cancelling previous demo generation request");
      pendingRequest.abort();
    }

    isGenerating = true;
    setGeneratingImage(true);

    // Create an AbortController for this request
    const controller = new AbortController();
    pendingRequest = controller;

    const payload = {
      config: configToSend,
      gpx_filename: gpxFilename,
      second: selectedSecond,
    };

    console.log("📤 Sending demo request:", {
      gpx: gpxFilename,
      second: selectedSecond,
      start: configToSend?.scene?.start,
      end: configToSend?.scene?.end,
    });

    const response = await fetch("http://localhost:3001/api/demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `Server error ${response.status}`;
      try {
        const errorData = await response.json();

        // Handle 429 (Too Many Requests / Busy) gracefully - don't throw error
        if (response.status === 429 && errorData.error_code === "BUSY") {
          console.log(
            "⏳ Backend is busy generating another frame, skipping this request",
          );
          return; // Silently skip this request
        }

        if (errorData.error) {
          errorMessage = errorData.error;
          console.error("❌ Backend error:", errorData);
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Check if response contains an error even with 200 status
    if (data.error) {
      console.error("❌ Backend returned error:", data);
      throw new Error(data.error);
    }

    const demoImageFilename = data.filename;
    if (demoImageFilename) {
      setImageFilename(demoImageFilename);
      console.log("✅ Image filename set:", demoImageFilename);

      // Clear any previous errors on success
      const { clearError } = useStore.getState();
      clearError();
    }
  } catch (error) {
    // Don't log abort errors as they're intentional
    if (error.name !== "AbortError") {
      console.error("Error generating demo frame:", error);

      // Set user-friendly error message in store
      const { setErrorMessage } = useStore.getState();
      setErrorMessage(error.message || "Failed to generate preview");

      // Don't re-throw - we've handled it by setting the error state
    }
  } finally {
    isGenerating = false;
    pendingRequest = null;
    const { setGeneratingImage } = useStore.getState();
    setGeneratingImage(false);
  }
}
