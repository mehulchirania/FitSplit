import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "@/lib/mutations";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

/**
 * Requests permission and registers this device's Expo push token on the
 * signed-in user's profile (registerPushTokenMobile). Web has no Expo push
 * support — the web app already has its own FCM flow — so this is a no-op
 * there. All failures are swallowed: push is an enhancement, never a blocker
 * for using the app.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "FitSplit",
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await registerPushToken(expoPushToken);
  } catch (err) {
    console.warn("[FitSplit] push registration skipped:", err);
  }
}
