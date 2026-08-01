import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Linking
} from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "@/lib/theme";

function getYouTubeEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  try {
    const cleanUrl = videoUrl.trim();
    if (cleanUrl.includes("youtube.com")) {
      const vMatch = cleanUrl.match(/[?&]v=([^&]+)/);
      if (vMatch && vMatch[1]) return `https://www.youtube.com/embed/${vMatch[1]}?autoplay=1&rel=0`;
      
      const shortsMatch = cleanUrl.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch && shortsMatch[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&rel=0`;
    }
    if (cleanUrl.includes("youtu.be")) {
      const parts = cleanUrl.split("youtu.be/");
      if (parts[1]) {
        const id = parts[1].split("?")[0].split("/")[0];
        if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      }
    }
  } catch {
    // Return fallback raw URL if parsing fails
  }
  return null;
}

function isPortraitVideo(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return false;
  return Boolean(videoUrl.includes("/shorts/"));
}

type VideoType = "tutorial" | "demo";

interface CatalogVideoPreviewProps {
  exerciseName: string;
  muscleGroup: string;
  videoUrl?: string;
  gymVideoUrl?: string;
}

export function CatalogVideoPreview({
  exerciseName,
  muscleGroup,
  videoUrl = "",
  gymVideoUrl = ""
}: CatalogVideoPreviewProps) {
  const [activeVideo, setActiveVideo] = useState<VideoType | null>(null);

  const hasTutorial = Boolean(videoUrl && videoUrl.trim().length > 0);
  const hasDemo = Boolean(gymVideoUrl && gymVideoUrl.trim().length > 0);

  if (!hasTutorial && !hasDemo) return null;

  const activeRawUrl = activeVideo
    ? activeVideo === "demo"
      ? gymVideoUrl
      : videoUrl
    : null;

  const activeEmbedUrl = activeRawUrl ? getYouTubeEmbedUrl(activeRawUrl) : null;
  const isPortrait = isPortraitVideo(activeRawUrl);

  const handleOpenExternal = () => {
    if (activeRawUrl) {
      void Linking.openURL(activeRawUrl);
    }
  };

  return (
    <View style={styles.container}>
      {hasTutorial && (
        <Pressable
          style={styles.badgeTutorial}
          onPress={() => setActiveVideo("tutorial")}
        >
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.badgeLabelTutorial}>DeltaBolic</Text>
        </Pressable>
      )}
      {hasDemo && (
        <Pressable
          style={styles.badgeDemo}
          onPress={() => setActiveVideo("demo")}
        >
          <Text style={styles.playIconDemo}>▶</Text>
          <Text style={styles.badgeLabelDemo}>Gym video</Text>
        </Pressable>
      )}

      {activeVideo && (
        <Modal
          visible={Boolean(activeVideo)}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveVideo(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, isPortrait && styles.modalCardPortrait]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.titleCol}>
                  <Text style={styles.eyebrow}>
                    {muscleGroup} · {activeVideo === "demo" ? "Gym Demo" : "DeltaBolic Tutorial"}
                  </Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {exerciseName}
                  </Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setActiveVideo(null)}
                >
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              {/* Player Container */}
              <View style={[styles.playerContainer, isPortrait && styles.playerContainerPortrait]}>
                {activeEmbedUrl ? (
                  <WebView
                    source={{ uri: activeEmbedUrl }}
                    style={styles.webView}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsFullscreenVideo
                  />
                ) : (
                  <View style={styles.fallbackBox}>
                    <Text style={styles.fallbackText}>This video opens outside FitSplit.</Text>
                    <Pressable style={styles.externalButton} onPress={handleOpenExternal}>
                      <Text style={styles.externalButtonText}>Open in YouTube App</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Modal Footer / External Link */}
              <View style={styles.modalFooter}>
                <Pressable style={styles.externalLink} onPress={handleOpenExternal}>
                  <Text style={styles.externalLinkText}>Open in YouTube ↗</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 4
  },
  badgeTutorial: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(200, 241, 53, 0.3)"
  },
  playIcon: {
    fontSize: 9,
    color: theme.brand
  },
  badgeLabelTutorial: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.brand
  },
  badgeDemo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)"
  },
  playIconDemo: {
    fontSize: 9,
    color: "#60a5fa"
  },
  badgeLabelDemo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#60a5fa"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden"
  },
  modalCardPortrait: {
    maxWidth: 360
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  titleCol: {
    flex: 1,
    marginRight: 12
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center"
  },
  closeText: {
    color: theme.textSoft,
    fontSize: 14,
    fontWeight: "600"
  },
  playerContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "#000000"
  },
  playerContainerPortrait: {
    height: 420
  },
  webView: {
    flex: 1,
    backgroundColor: "#000000"
  },
  fallbackBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  fallbackText: {
    color: theme.textSoft,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center"
  },
  externalButton: {
    backgroundColor: theme.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  externalButtonText: {
    color: theme.primaryForeground,
    fontWeight: "700",
    fontSize: 13
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: "rgba(0, 0, 0, 0.3)"
  },
  externalLink: {
    paddingVertical: 4
  },
  externalLinkText: {
    color: theme.brand,
    fontSize: 12,
    fontWeight: "600"
  }
});
