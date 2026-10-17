import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { registerForPush } from "../lib/notifications";
import { notificationRoute, subscribeNotifications } from "../lib/inbox";

const ROUTED_TYPES = new Set([
  "booking_request", "booking_accepted", "booking_confirmed", "booking_rejected", "booking_completed",
  "payment_confirmed", "open_request", "proposal_received", "proposal_updated", "proposal_selected",
  "marketing",
]);

// Registers this device for push once signed in, and opens the right screen when a push is tapped.
export default function NotificationBridge({ navigationRef }) {
  const { user } = useAuth();
  const { notificationsEnabled, ready } = usePreferences();
  const registeredFor = useRef(null);
  const [webNotice, setWebNotice] = useState(null);

  useEffect(() => {
    if (Platform.OS === "web" || !ready || !user?.id || !notificationsEnabled) return;
    if (registeredFor.current === user.id) return;
    registeredFor.current = user.id;
    registerForPush().catch((error) => console.warn("Push registration failed", error?.message || error));
  }, [notificationsEnabled, ready, user?.id]);

  useEffect(() => {
    if (!user?.id) registeredFor.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === "web" || !user?.id) return undefined;
    const openFromResponse = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (!ROUTED_TYPES.has(data.type)) return;
      const route = notificationRoute(user.role, { type: data.type, request_id: data.requestId, data });
      const go = () => navigationRef.isReady() ? navigationRef.navigate(route.name, route.params) : setTimeout(go, 250);
      go();
    };
    Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openFromResponse(response); }).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => subscription.remove();
  }, [navigationRef, user?.id, user?.role]);

  useEffect(() => {
    if (Platform.OS !== "web" || !user?.id || !notificationsEnabled) return undefined;
    return subscribeNotifications(user.id, (event) => {
      if (event.eventType !== "INSERT" || !event.new) return;
      const item = event.new;
      if (item.type === "marketing" && item.data?.channel === "mobile") return;
      setWebNotice(item);
    });
  }, [notificationsEnabled, user?.id]);

  useEffect(() => {
    if (!webNotice) return undefined;
    const timeout = setTimeout(() => setWebNotice(null), 7000);
    return () => clearTimeout(timeout);
  }, [webNotice]);

  if (Platform.OS !== "web" || !webNotice) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${webNotice.title}. Open notification`} onPress={() => {
    const route = notificationRoute(user?.role, webNotice);
    setWebNotice(null);
    if (navigationRef.isReady()) navigationRef.navigate(route.name, route.params);
  }} style={{ position: "absolute", right: 20, top: 20, width: 320, maxWidth: "calc(100vw - 40px)", zIndex: 1000, padding: 16, borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5D4C9", boxShadow: "0 12px 36px rgba(44,28,18,.2)" }}>
    <View><Text style={{ fontSize: 10, fontWeight: "800", color: "#B84C20", marginBottom: 5 }}>PUROHITH CONNECT · NOW</Text><Text style={{ fontSize: 14, fontWeight: "800", color: "#27221F" }}>{webNotice.title}</Text><Text style={{ fontSize: 12, color: "#6C625C", marginTop: 4 }}>{webNotice.body}</Text></View>
  </Pressable>;
}
