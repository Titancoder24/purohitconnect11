import { supabase } from "./supabase";

const vapidKey = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY;

function decodeBase64Url(value) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function webPushSupported() {
  return typeof window !== "undefined" && window.isSecureContext && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function webPushPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function registerWebPush(userId) {
  if (!webPushSupported()) return { status: "unsupported" };
  if (!vapidKey) return { status: "unconfigured" };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: permission };
  const registration = await navigator.serviceWorker.register("/web-notifications-sw.js");
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(vapidKey),
  });
  const serialized = subscription.toJSON();
  const { error } = await supabase.from("web_push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: serialized.keys?.p256dh,
    auth: serialized.keys?.auth,
    user_agent: navigator.userAgent.slice(0, 500),
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return { status: "registered" };
}

export async function unregisterWebPush() {
  if (!webPushSupported() || !supabase) return;
  const registration = await navigator.serviceWorker.getRegistration("/web-notifications-sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from("web_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
