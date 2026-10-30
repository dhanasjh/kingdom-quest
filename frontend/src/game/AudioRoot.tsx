import React, { useEffect } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";

import { pauseMusic, startMusic, unlockAudioFromUserGesture } from "@/src/game/sound";

// Requests music on startup; browsers begin playback after the first real user gesture.
export function AudioRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startMusic();
    const sub = AppState.addEventListener("change", (s) => (s === "active" ? startMusic() : pauseMusic()));
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return () => sub.remove();
    }

    const unlock = () => unlockAudioFromUserGesture();
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      sub.remove();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, []);
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
