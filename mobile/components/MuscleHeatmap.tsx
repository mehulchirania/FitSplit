/**
 * MuscleHeatmap — front/back body silhouette shaded by training volume.
 *
 * Uses react-native-svg to draw simplified front and back body outlines.
 * Each of FitSplit's 9 MuscleGroups maps to a coloured overlay region.
 * Intensity (0–1) comes from getMuscleHeatmap() in @fitsplit/core.
 *
 * The SVG paths are simplified anatomical silhouettes — accurate enough to
 * communicate which zones are hot/cold at a glance, not medical diagrams.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Path, Ellipse, Rect, G } from "react-native-svg";
import type { MuscleGroup } from "@fitsplit/core";
import { theme } from "@/lib/theme";

// ─── Intensity → colour ────────────────────────────────────────────────────────

function intensityToColor(intensity: number | undefined): string {
  if (!intensity || intensity <= 0) return "rgba(255,255,255,0.06)";
  // Brand lime with opacity scaled by intensity
  const alpha = 0.15 + intensity * 0.75;
  return `rgba(200, 241, 53, ${alpha.toFixed(2)})`;
}

// ─── SVG dimensions ───────────────────────────────────────────────────────────

const W = 120; // per silhouette
const H = 220;

// ─── Front body paths ─────────────────────────────────────────────────────────

function FrontBody({ heatmap }: { heatmap: Map<MuscleGroup, number> }) {
  const c = (g: MuscleGroup) => intensityToColor(heatmap.get(g));
  return (
    <Svg width={W} height={H} viewBox="0 0 120 220">
      {/* Head */}
      <Ellipse cx="60" cy="16" rx="13" ry="15" fill="rgba(255,255,255,0.08)" />
      {/* Neck */}
      <Rect x="54" y="29" width="12" height="10" rx="4" fill="rgba(255,255,255,0.06)" />

      {/* Chest */}
      <Path
        d="M35 42 Q60 38 85 42 L88 72 Q60 80 32 72 Z"
        fill={c("Chest")}
      />

      {/* Shoulders */}
      <Ellipse cx="28" cy="52" rx="12" ry="16" fill={c("Shoulders")} />
      <Ellipse cx="92" cy="52" rx="12" ry="16" fill={c("Shoulders")} />

      {/* Biceps */}
      <Rect x="14" y="67" width="13" height="28" rx="6" fill={c("Biceps")} />
      <Rect x="93" y="67" width="13" height="28" rx="6" fill={c("Biceps")} />

      {/* Forearms */}
      <Rect x="10" y="98" width="11" height="26" rx="5" fill={c("Forearms")} />
      <Rect x="99" y="98" width="11" height="26" rx="5" fill={c("Forearms")} />

      {/* Core / abs */}
      <Path
        d="M38 74 Q60 80 82 74 L80 120 Q60 126 40 120 Z"
        fill={c("Core")}
      />

      {/* Legs — quads / front */}
      <Path
        d="M40 122 L50 125 L52 175 L38 175 Z"
        fill={c("Legs")}
      />
      <Path
        d="M80 122 L70 125 L68 175 L82 175 Z"
        fill={c("Legs")}
      />

      {/* Calves front */}
      <Rect x="38" y="177" width="14" height="34" rx="6" fill={c("Legs")} />
      <Rect x="68" y="177" width="14" height="34" rx="6" fill={c("Legs")} />

      {/* Body outline */}
      <Path
        d="M35 42 Q20 42 16 68 L10 98 L14 98 L21 128 L38 122 L40 180 L52 180 L52 175 L60 175 L68 175 L68 180 L80 180 L82 122 L99 128 L106 98 L110 98 L104 68 Q100 42 85 42 Q60 38 35 42"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
      />
    </Svg>
  );
}

// ─── Back body paths ──────────────────────────────────────────────────────────

function BackBody({ heatmap }: { heatmap: Map<MuscleGroup, number> }) {
  const c = (g: MuscleGroup) => intensityToColor(heatmap.get(g));
  return (
    <Svg width={W} height={H} viewBox="0 0 120 220">
      {/* Head */}
      <Ellipse cx="60" cy="16" rx="13" ry="15" fill="rgba(255,255,255,0.08)" />
      {/* Neck */}
      <Rect x="54" y="29" width="12" height="10" rx="4" fill="rgba(255,255,255,0.06)" />

      {/* Traps / upper back */}
      <Path
        d="M44 40 Q60 36 76 40 L82 56 Q60 62 38 56 Z"
        fill={c("Back")}
      />

      {/* Rear delts / shoulders */}
      <Ellipse cx="28" cy="50" rx="12" ry="14" fill={c("Shoulders")} />
      <Ellipse cx="92" cy="50" rx="12" ry="14" fill={c("Shoulders")} />

      {/* Lats / mid back */}
      <Path
        d="M36 56 Q60 64 84 56 L82 90 Q60 100 38 90 Z"
        fill={c("Back")}
      />

      {/* Triceps */}
      <Rect x="14" y="64" width="13" height="28" rx="6" fill={c("Triceps")} />
      <Rect x="93" y="64" width="13" height="28" rx="6" fill={c("Triceps")} />

      {/* Forearms */}
      <Rect x="10" y="95" width="11" height="26" rx="5" fill={c("Forearms")} />
      <Rect x="99" y="95" width="11" height="26" rx="5" fill={c("Forearms")} />

      {/* Lower back / erectors */}
      <Path
        d="M40 90 Q60 100 80 90 L78 118 Q60 124 42 118 Z"
        fill={c("Core")}
      />

      {/* Glutes */}
      <Ellipse cx="50" cy="128" rx="14" ry="10" fill={c("Legs")} />
      <Ellipse cx="70" cy="128" rx="14" ry="10" fill={c("Legs")} />

      {/* Hamstrings */}
      <Path
        d="M37 133 L50 136 L50 175 L37 175 Z"
        fill={c("Legs")}
      />
      <Path
        d="M83 133 L70 136 L70 175 L83 175 Z"
        fill={c("Legs")}
      />

      {/* Calves */}
      <Rect x="37" y="177" width="14" height="34" rx="6" fill={c("Legs")} />
      <Rect x="69" y="177" width="14" height="34" rx="6" fill={c("Legs")} />

      {/* Body outline */}
      <Path
        d="M36 56 Q20 56 16 68 L10 95 L14 95 L20 128 L36 133 L37 180 L52 180 L52 175 L60 175 L68 175 L68 180 L83 180 L83 133 L100 128 L106 95 L110 95 L104 68 Q100 56 84 56"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
      />
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const MUSCLE_LABELS: MuscleGroup[] = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Legs", "Core", "Cardio", "Forearms"
];

// ─── Main component ───────────────────────────────────────────────────────────

interface MuscleHeatmapProps {
  heatmap: Map<MuscleGroup, number>;
}

export function MuscleHeatmap({ heatmap }: MuscleHeatmapProps) {
  const sortedMuscles = useMemo(
    () =>
      MUSCLE_LABELS.map((g) => ({ group: g, intensity: heatmap.get(g) ?? 0 }))
        .filter((m) => m.intensity > 0)
        .sort((a, b) => b.intensity - a.intensity),
    [heatmap]
  );

  const isEmpty = sortedMuscles.length === 0;

  return (
    <View style={styles.container}>
      {/* Silhouettes */}
      <View style={styles.silhouettes}>
        <View style={styles.silhouetteWrap}>
          <FrontBody heatmap={heatmap} />
          <Text style={styles.silhouetteLabel}>Front</Text>
        </View>
        <View style={styles.silhouetteWrap}>
          <BackBody heatmap={heatmap} />
          <Text style={styles.silhouetteLabel}>Back</Text>
        </View>
      </View>

      {/* Legend */}
      {isEmpty ? (
        <Text style={styles.empty}>Log some sets to see your muscle emphasis.</Text>
      ) : (
        <View style={styles.legend}>
          {sortedMuscles.map(({ group, intensity }) => (
            <View key={group} style={styles.legendRow}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: intensityToColor(intensity) },
                ]}
              />
              <Text style={styles.legendLabel}>{group}</Text>
              <Text style={styles.legendPct}>{Math.round(intensity * 100)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  silhouettes: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  silhouetteWrap: {
    alignItems: "center",
    gap: 6,
  },
  silhouetteLabel: {
    fontSize: 11,
    color: theme.textSoft,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legend: {
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    fontWeight: "500",
  },
  legendPct: {
    fontSize: 13,
    color: theme.brand,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
  empty: {
    fontSize: 13,
    color: theme.textSoft,
    textAlign: "center",
    paddingVertical: 8,
  },
});
