import { create } from "zustand";

// Flags to prevent circular updates
let isUpdatingFromConfig = false;
let isUpdatingFromTimeline = false;

const useStore = create((set, get) => ({
  communityTemplateFilename: null,
  loadedTemplateFilename: null,
  editor: null,
  generatingImage: false,
  renderingVideo: false,
  imageFilename: localStorage.getItem("imageFilename") || null,
  videoFilename: localStorage.getItem("videoFilename") || null,
  gpxFilename: localStorage.getItem("gpxFilename") || null,

  // Slider states - load from localStorage if available
  dummyDurationSeconds: (() => {
    const saved = localStorage.getItem("dummyDurationSeconds");
    return saved ? parseInt(saved, 10) : 73;
  })(),
  startSecond: (() => {
    const saved = localStorage.getItem("startSecond");
    return saved ? parseInt(saved, 10) : 0;
  })(),
  endSecond: (() => {
    const saved = localStorage.getItem("endSecond");
    return saved ? parseInt(saved, 10) : 73;
  })(),
  selectedSecond: (() => {
    const saved = localStorage.getItem("selectedSecond");
    return saved ? parseInt(saved, 10) : 0;
  })(),

  config: (() => {
    const savedConfig = localStorage.getItem("editorConfig");
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        console.warn("Failed to parse saved config, using null");
      }
    }
    // Start with null - user must select a template
    return null;
  })(), // This will hold the editor config
  setConfig: (val) => {
    localStorage.setItem("editorConfig", JSON.stringify(val));

    // Set flag to prevent timeline setters from updating config
    isUpdatingFromConfig = true;

    const currentState = get();

    // Preserve existing timeline values if they exist
    // Only use config values if we don't have timeline values yet
    const updates = { config: val };

    if (val.scene) {
      // Only update timeline if we don't have values yet (initial load)
      const hasExistingTimeline = currentState.startSecond !== 0 || currentState.endSecond !== currentState.dummyDurationSeconds;

      if (!hasExistingTimeline) {
        console.log("📍 No existing timeline, using config values");
        if (val.scene.start !== undefined) {
          updates.startSecond = val.scene.start;
        }
        if (val.scene.end !== undefined) {
          updates.endSecond = val.scene.end;
          updates.dummyDurationSeconds = val.scene.end;
        }
        if (val.scene.start !== undefined) {
          updates.selectedSecond = val.scene.start;
        }
      } else {
        console.log("📍 Preserving existing timeline values");
        // Update config to match current timeline values
        val.scene.start = currentState.startSecond;
        val.scene.end = currentState.endSecond;
        updates.config = val;
        localStorage.setItem("editorConfig", JSON.stringify(val));
      }
    }

    set(updates);

    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromConfig = false;
    }, 100);
  },

  setGeneratingImage: (generating) => set({ generatingImage: generating }),
  setRenderingVideo: (rendering) => set({ renderingVideo: rendering }),

  setDummyDurationSeconds: (duration) => {
    localStorage.setItem("dummyDurationSeconds", duration.toString());
    set({ dummyDurationSeconds: duration });
  },

  setStartSecond: (second) => {
    console.log("📍 setStartSecond called:", second);
    localStorage.setItem("startSecond", second.toString());

    const state = get();
    const updates = { startSecond: second };

    // Always update config to match, unless we're in the middle of loading config
    if (!isUpdatingFromConfig && state.config && state.config.scene) {
      isUpdatingFromTimeline = true;

      const newConfig = JSON.parse(JSON.stringify(state.config)); // Deep clone
      newConfig.scene.start = second;
      updates.config = newConfig;
      localStorage.setItem("editorConfig", JSON.stringify(newConfig));
      console.log("📍 Config updated: start =", second);

      // Update editor if it exists
      const editor = state.editor;
      if (editor) {
        try {
          editor.setValue(newConfig);
          console.log("📍 Editor updated with new config");
        } catch (e) {
          console.warn("⚠️ Could not update editor:", e.message);
        }
      }

      setTimeout(() => {
        isUpdatingFromTimeline = false;
      }, 100);
    } else if (isUpdatingFromConfig) {
      console.log("📍 Skipping config update (loading from config)");
    } else {
      console.warn("⚠️ No scene in config, cannot update start");
    }

    set(updates);
  },

  setEndSecond: (second) => {
    console.log("📍 setEndSecond called:", second);
    localStorage.setItem("endSecond", second.toString());

    const state = get();
    const updates = { endSecond: second };

    // Always update config to match, unless we're in the middle of loading config
    if (!isUpdatingFromConfig && state.config && state.config.scene) {
      isUpdatingFromTimeline = true;

      const newConfig = JSON.parse(JSON.stringify(state.config)); // Deep clone
      newConfig.scene.end = second;
      updates.config = newConfig;
      localStorage.setItem("editorConfig", JSON.stringify(newConfig));
      console.log("📍 Config updated: end =", second);

      // Update editor if it exists
      const editor = state.editor;
      if (editor) {
        try {
          editor.setValue(newConfig);
          console.log("📍 Editor updated with new config");
        } catch (e) {
          console.warn("⚠️ Could not update editor:", e.message);
        }
      }

      setTimeout(() => {
        isUpdatingFromTimeline = false;
      }, 100);
    } else if (isUpdatingFromConfig) {
      console.log("📍 Skipping config update (loading from config)");
    } else {
      console.warn("⚠️ No scene in config, cannot update end");
    }

    set(updates);
  },

  setSelectedSecond: (second) => {
    localStorage.setItem("selectedSecond", second.toString());
    set({ selectedSecond: second });
  },

  setImageFilename: (filename) => {
    // Fixed typo: was "imageFilename", should be "imageFilename"
    localStorage.setItem("imageFilename", filename);
    set({ imageFilename: filename });
  },

  setVideoFilename: (filename) => {
    localStorage.setItem("videoFilename", filename);
    set({ videoFilename: filename });
  },

  setGpxFilename: async (filename) => {
    localStorage.setItem("gpxFilename", filename);
    set({ gpxFilename: filename });
    // Only attempt to fetch local file contents for actual .gpx files
    const isLikelyGpx = typeof filename === "string" && (filename.endsWith(".gpx") || filename.startsWith("http"));
    if (!isLikelyGpx) return;
    try {
      const response = await fetch(filename);
      const fileBlob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(",")[1];
        // localStorage.setItem("gpxFilestring", base64String);
        // set({ gpxFilestring: base64String });
      };
      reader.readAsDataURL(fileBlob);
    } catch (error) {
      console.warn("setGpxFilename: could not fetch GPX file contents (expected for demo)");
    }
  },

  setGpxFilenameFromFile: (file) => {
    console.log("in setting from file");
    if (file) {
      set({ gpxFilename: file["name"] });
    } else {
      set({ gpxFilename: null });
    }
  },

  setLoadedTemplateFilename: (filename) => {
    set({ communityTemplateFilename: null, loadedTemplateFilename: filename });
  },

  setEditor: (editor) => set({ editor }),

  SelectCommunityTemplateFilename: async (filename) => {
    set({
      loadedTemplateFilename: null,
      communityTemplateFilename: filename,
    });

    if (!filename) return;

    try {
      const url = `templates/${filename}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log("SelectCommunityTemplateButton: network response was bad");
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      const editor = get().editor;
      const setConfig = get().setConfig;

      // Always update the config in the store
      console.log("Setting config from community template");
      setConfig(data);

      if (editor) {
        // Update the editor UI - this will trigger the change event
        // which will call generateDemoFrame
        console.log("Setting editor value from community template");
        editor.setValue(data);
      } else {
        console.warn("Editor is not set in store, generating demo frame directly");
        // If editor isn't ready yet, manually trigger demo frame generation
        const generateDemoFrame = (await import("../api/generateDemoFrame.jsx")).default;
        await generateDemoFrame(data);
      }
    } catch (error) {
      console.log("Error with community templates");
      console.error(error);
    }
  },
}));

// Export function to check if we're updating from timeline
export const isUpdatingFromTimelineFlag = () => isUpdatingFromTimeline;

export default useStore;
