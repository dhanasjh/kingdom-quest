import React, { useEffect } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { pauseMusic, startMusic } from "@/src/game/sound";

// Starts music on first touch (web autoplay rules) and pauses it in background.
export function AudioRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startMusic();
    const sub = AppState.addEventListener("change", (s) => (s === "active" ? startMusic() : pauseMusic()));
    return () => sub.remove();
  }, []);
  return (
    <View style={styles.root} onTouchStart={startMusic}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
