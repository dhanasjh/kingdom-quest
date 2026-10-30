import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { Board, Pos, SIZE } from "@/src/game/engine";
import { PieceView } from "@/src/components/PieceView";
import { artFor } from "@/src/game/art";
import { fonts, radius, useTheme } from "@/src/theme";
import { playSfx } from "@/src/game/sound";
import type { FestivalEffectType } from "@/src/game/festivals";

type Props = {
  board: Board;
  cell: number;
  cellHeight?: number;
  dying: Set<number>;
  spawnFrom: Record<number, number>;
  selected: Pos | null;
  hint: Pos[] | null;
  roster?: number[];
  customPhotos?: (string | null)[];
  festivalTiles?: string[];
  festivalEffects?: Partial<Record<number, FestivalEffectType>>;
  cheer?: { color: number; tick: number } | null;
  onTapCell: (p: Pos) => void;
  onSwipe: (from: Pos, to: Pos) => void;
};

export function GameBoard({ board, cell, cellHeight = cell, dying, spawnFrom, selected, hint, roster, customPhotos, festivalTiles, festivalEffects, cheer, onTapCell, onSwipe }: Props) {
  const { colors } = useTheme();
  const width = cell * SIZE;
  const rowInset = (cellHeight - cell) / 2;
  const height = cellHeight * (SIZE - 1) + cell;
  // Keep the grid itself clear of the frame border. Touch coordinates are
  // translated by the same inset so edge cells remain easy to tap and swipe.
  const boardInset = 4;
  const gesture = useMemo(() => {
    const state: { start: Pos | null; fired: boolean } = { start: null, fired: false };
    const toCell = (x: number, y: number): Pos => ({
      r: Math.max(0, Math.min(SIZE - 1, Math.floor((y - boardInset) / cellHeight))),
      c: Math.max(0, Math.min(SIZE - 1, Math.floor((x - boardInset) / cell))),
    });
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(6)
      .onStart((e) => {
        state.start = toCell(e.x - e.translationX, e.y - e.translationY);
        state.fired = false;
      })
      .onUpdate((e) => {
        if (state.fired || !state.start) return;
        const { translationX: dx, translationY: dy } = e;
        const thX = cell * 0.35;
        const thY = cellHeight * 0.35;
        if (Math.abs(dx) < thX && Math.abs(dy) < thY) return;
        state.fired = true;
        const s = state.start;
        const to = Math.abs(dx) > Math.abs(dy) ? { r: s.r, c: s.c + Math.sign(dx) } : { r: s.r + Math.sign(dy), c: s.c };
        onSwipe(s, to);
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => {
        playSfx("tap");
        onTapCell(toCell(e.x, e.y));
      });
    return Gesture.Race(pan, tap);
  }, [boardInset, cell, cellHeight, onSwipe, onTapCell]);

  const pieces: React.ReactNode[] = [];
  const tiles: React.ReactNode[] = [];
  const overlays: React.ReactNode[] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const t = board.tiles[r][c];
      tiles.push(
        <View
          key={`t${r}-${c}`}
          testID={`cell-${r}-${c}`}
          style={[styles.abs, { left: c * cell, top: r * cellHeight + rowInset, width: cell, height: cell, backgroundColor: (r + c) % 2 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)" }]}
        >
          {t.ice > 0 ? (
            <View
              testID={`ice-${r}-${c}`}
              style={[styles.abs, styles.ice, { left: 2, top: (cellHeight - cell) / 2 + 2, width: cell - 4, height: cell - 4, backgroundColor: t.ice > 1 ? colors.iceStrong : colors.ice, borderColor: colors.surfaceSecondary }]}
            />
          ) : null}
        </View>,
      );
      const p = board.pieces[r][c];
      if (p)
        pieces.push(
          <PieceView
            key={p.id}
            piece={p}
            row={r}
            col={c}
            fromRow={spawnFrom[p.id]}
            cell={cell}
            cellHeight={cellHeight}
            dying={dying.has(p.id)}
            selected={!!selected && selected.r === r && selected.c === c}
            hint={!!hint && hint.some((h) => h.r === r && h.c === c)}
            art={artFor(p.color, roster, customPhotos)}
            festivalTile={festivalTiles?.[p.color]}
            festivalEffect={festivalEffects?.[p.color]}
            cheerTick={cheer && cheer.color === p.color && p.special !== "rainbow" ? cheer.tick : undefined}
          />,
        );
      if (t.crate > 0)
        overlays.push(
          <View
            key={`o${r}-${c}`}
            testID={`crate-${r}-${c}`}
            style={[styles.abs, styles.crate, { left: c * cell + 2, top: r * cellHeight + (cellHeight - cell) / 2 + 2, width: cell - 4, height: cell - 4, backgroundColor: t.crate > 1 ? colors.crateDark : colors.crate, borderColor: colors.crateDark }]}
          >
            <MaterialDesignIcons name="package-variant-closed" size={cell * 0.55} color={colors.onCrate} />
            {t.crate > 1 ? <Text style={[styles.crateNum, { color: colors.onCrate }]}>{t.crate}</Text> : null}
          </View>,
        );
      else if (t.lock || t.vine)
        overlays.push(
          <View
            key={`o${r}-${c}`}
            testID={`${t.lock ? "lock" : "vine"}-${r}-${c}`}
            style={[styles.abs, styles.center, { left: c * cell, top: r * cellHeight + (cellHeight - cell) / 2, width: cell, height: cell, backgroundColor: t.lock ? colors.lockTint : colors.vine, borderRadius: radius.md }]}
          >
            <MaterialDesignIcons name={t.lock ? "lock" : "grass"} size={cell * 0.38} color={colors.onSurfaceInverse} />
          </View>,
        );
    }

  return (
    <GestureDetector gesture={gesture}>
      <View testID="game-board" collapsable={false} style={[styles.board, { width: width + boardInset * 2, height: height + boardInset * 2, borderColor: colors.boardFrame }]}>
        <View style={[styles.grid, { width, height }]}>
          {tiles}
          {pieces}
          <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
            {overlays}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: { overflow: "hidden", borderRadius: radius.md, borderWidth: 2, padding: 2, backgroundColor: "rgba(255,255,255,0.22)" },
  grid: { position: "relative", overflow: "hidden", borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.08)" },
  abs: { position: "absolute" },
  center: { alignItems: "center", justifyContent: "center" },
  ice: { borderRadius: radius.sm, borderWidth: 1 },
  crate: { borderRadius: radius.sm, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  crateNum: { position: "absolute", bottom: 1, right: 4, fontFamily: fonts.display, fontSize: 12 },
});
