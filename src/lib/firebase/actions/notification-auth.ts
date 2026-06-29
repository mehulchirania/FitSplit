export type NotificationAuthUser = {
  uid: string;
  role: string;
  gymId?: string;
  memberId?: string;
};

export type NotificationAuthRecord = {
  gymId?: unknown;
  recipientId?: unknown;
  recipientRole?: unknown;
};

export function canMarkNotificationRead(
  currentUser: NotificationAuthUser,
  notification: NotificationAuthRecord
) {
  if (currentUser.role === "admin") {
    return true;
  }

  const notificationGymId = notification.gymId ? String(notification.gymId) : "";
  const sameGym = !notificationGymId || notificationGymId === currentUser.gymId;

  if (currentUser.role === "member") {
    return (
      sameGym &&
      String(notification.recipientId ?? "") === (currentUser.memberId ?? currentUser.uid)
    );
  }

  return (
    currentUser.role === "owner" &&
    sameGym &&
    String(notification.recipientRole ?? "") === "owner"
  );
}
