/**
 * ActivityHeatmap — GitHub-style 12-week workout consistency calendar.
 *
 * Renders a 12-column × 7-row grid where each cell represents one calendar day
 * (Mon at the top of each column). Cells shade from the FitSplit brand lime
 * (#C8F135) when the day was trained, to a dim surface colour when rest.
 *
 * Data is provided via `buildActivityHeatmapData` from @fitsplit/core.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { buildActivityHeatmapData } from "@fitsplit/core";
import { theme } from "@/lib/theme";

const WEEKS = 12;
const DAYS_PER_WEEK = 7;
const CELL_SIZE = 13;
const CELL_GAP = 3;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface ActivityHeatmapProps {
  trainedDateKeys: Set<string>;
}

export function ActivityHeatmap({ trainedDateKeys }: ActivityHeatmapProps) {
  // Build the 84-day map and convert to a column-major 2D array
  // columns = weeks (oldest first), rows = weekdays (Mon = 0)
  const grid = useMemo(() => {
    const data = buildActivityHeatmapData(trainedDateKeys, WEEKS * DAYS_PER_WEEK);
    const entries = Array.from(data.entries()); // [dateKey, value] in ascending order
    // Pad so the first entry starts on a Monday (index 0 in a week column)
    const cols: { date: string; value: number }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { date: string; value: number }[] = [];
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const entry = entries[w * DAYS_PER_WEEK + d];
        if (entry) col.push({ date: entry[0], value: entry[1] });
      }
      cols.push(col);
    }
    return cols;
  }, [trainedDateKeys]);

  // Month labels: find first week of each new month
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = "";
    grid.forEach((col, colIndex) => {
      const firstCell = col[0];
      if (!firstCell) return;
      const month = firstCell.date.slice(0, 7); // YYYY-MM
      if (month !== lastMonth) {
        const label = new Date(`${firstCell.date}T12:00:00`).toLocaleString("en-US", {
          month: "short",
        });
        labels.push({ label, colIndex });
        lastMonth = month;
      }
    });
    return labels;
  }, [grid]);

  const cellWidth = CELL_SIZE + CELL_GAP;

  return (
    <View style={styles.container}>
      <View style={styles.gridRow}>
        {/* Day-of-week labels on the left */}
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.dayLabel}>
              {i % 2 === 0 ? label : ""}
            </Text>
          ))}
        </View>

        {/* The heatmap grid */}
        <View style={styles.grid}>
          {grid.map((col, colIndex) => (
            <View key={colIndex} style={styles.column}>
              {col.map((cell, rowIndex) => {
                const intensity = cell.value;
                return (
                  <View
                    key={rowIndex}
                    style={[
                      styles.cell,
                      {
                        backgroundColor:
                          intensity > 0
                            ? `rgba(200, 241, 53, ${0.35 + 0.65 * intensity})`
                            : theme.bgHover,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Month labels along the bottom */}
      <View style={[styles.monthRow, { paddingLeft: 18 }]}>
        {monthLabels.map(({ label, colIndex }) => (
          <Text
            key={`${label}-${colIndex}`}
            style={[styles.monthLabel, { left: colIndex * cellWidth }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  dayLabels: {
    flexDirection: "column",
    gap: CELL_GAP,
    paddingTop: 1,
  },
  dayLabel: {
    fontSize: 9,
    color: theme.textSoft,
    width: 10,
    height: CELL_SIZE,
    textAlignVertical: "center",
    lineHeight: CELL_SIZE,
  },
  grid: {
    flexDirection: "row",
    gap: CELL_GAP,
    flexWrap: "nowrap",
  },
  column: {
    flexDirection: "column",
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  monthRow: {
    flexDirection: "row",
    position: "relative",
    height: 14,
  },
  monthLabel: {
    position: "absolute",
    fontSize: 9,
    color: theme.textSoft,
  },
});
