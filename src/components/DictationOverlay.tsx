import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { VoiceWaveIndicator } from "./VoiceWaveIndicator";

type OverlayActivity = "idle" | "starting" | "recording" | "finalizing";

/**
 * Floating pill shown in its own always-on-top window. Small and quiet while
 * idle, it expands into a live waveform while dictating. Drag it anywhere.
 */
export function DictationOverlay() {
  const [activity, setActivity] = useState<OverlayActivity>("idle");
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanups: Array<() => void> = [];

    const setup = async () => {
      const unlistenActivity = await listen<OverlayActivity>(
        "overlay-activity",
        (event) => {
          setActivity(event.payload);
          if (event.payload !== "recording") {
            setLevel(0);
          }
        },
      );

      const unlistenAudioLevel = await listen<number>(
        "audio-level",
        (event) => {
          setLevel(event.payload);
        },
      );

      if (cancelled) {
        unlistenActivity();
        unlistenAudioLevel();
        return;
      }

      cleanups = [unlistenActivity, unlistenAudioLevel];
    };

    setup();

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const isListening = activity === "recording";
  const isExpanded = activity !== "idle";

  const startDrag = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    getCurrentWindow().startDragging().catch(console.error);
  };

  return (
    <div className="dictation-overlay" onMouseDown={startDrag}>
      <div
        className={`dictation-pill dictation-pill--${activity} ${isExpanded ? "expanded" : ""}`}
      >
        {isExpanded && (
          <VoiceWaveIndicator
            isListening={isListening}
            level={isListening ? level : 0}
          />
        )}
      </div>
    </div>
  );
}
