import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { useTheme } from "@/src/theme";

function AnimatedStar({ filled, index, size, animate }: { filled: boolean; index: number; size: number; animate: boolean }) {
  const { colors } = useTheme();
  const s = useSharedValue(animate && filled ? 0 : 1);
  useEffect(() => {
    if (animate && filled) s.value = withDelay(300 + index * 350, withSpring(1, { damping: 6, stiffness: 160 }));
  }, [animate, filled, index, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ width: size, height: size, marginTop: index === 1 ? -size * 0.2 : 0 }}>
      <MaterialDesignIcons name="star" size={size} color={colors.starEmpty} style={{ position: "absolute" }} />
      {filled ? (
        <Animated.View style={style}>
          <MaterialDesignIcons name="star" size={size} color={colors.gold} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function StarRow({ stars, size = 20, animate = false, testID }: { stars: number; size?: number; animate?: boolean; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[0, 1, 2].map((i) => (
        <AnimatedStar key={i} index={i} filled={i < stars} size={size} animate={animate} />
      ))}
    </View>
  );
}
