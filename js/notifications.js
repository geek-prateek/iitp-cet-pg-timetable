// IIT Patna Timetable - Client Push Notifications
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyzGm22sstzNeLLx5aGeiV1ZsAWYWhoXg",
  authDomain: "iitp-timetable.firebaseapp.com",
  projectId: "iitp-timetable",
  storageBucket: "iitp-timetable.firebasestorage.app",
  messagingSenderId: "731679222233",
  appId: "1:731679222233:web:44223a8b0c0d690a2291c8"
};

const BACKEND_URL = "https://iitp-timetable-admin-eight.vercel.app/api/notifications";

// Web Push Certificate (VAPID Key) generated in Firebase Console
// Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = window.IITP_VAPID_KEY || "BODJ38CnN2K2-9_2z2ItQu3GmySmQYKMN1ZbLaodPICjBrdHJgSGQ0ggCwR8OYobrSsYAaUVShEm-KiDiUl7otQ";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let messaging = null;
let swRegistration = null;

async function initMessaging() {
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.log("[Push Notifications] Not supported in this browser environment.");
    return false;
  }

  try {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register("firebase-messaging-sw.js", { scope: "/" });
      console.log("[Push Notifications] Service Worker registered:", swRegistration);
    }

    messaging = getMessaging(app);

    // Foreground message listener (when student is actively browsing the timetable)
    onMessage(messaging, (payload) => {
      console.log("[Push Notifications] Foreground notification received:", payload);
      const title = payload.notification?.title || payload.data?.title || "📢 IIT Patna Announcement";
      const body = payload.notification?.body || payload.data?.message || payload.data?.body;

      if (body) {
        // Update banner immediately on page
        if (typeof window.NOTIFICATION !== "undefined") {
          window.NOTIFICATION = body;
          const banner = document.querySelector(".notification-banner");
          if (banner) {
            banner.textContent = body;
            banner.style.display = "flex";
          }
        }
        showInAppToast(title, body);
      }
    });

    return true;
  } catch (err) {
    console.error("[Push Notifications] Init error:", err);
    return false;
  }
}

async function requestAndSubscribe(showFeedback = true) {
  if (!("Notification" in window)) {
    if (showFeedback) alert("This browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  updateUI(permission);

  if (permission === "granted") {
    try {
      if (!messaging) await initMessaging();
      if (!messaging) return;

      const tokenOptions = { serviceWorkerRegistration: swRegistration };
      if (VAPID_KEY) {
        tokenOptions.vapidKey = VAPID_KEY;
      }

      const token = await getToken(messaging, tokenOptions);
      if (token) {
        console.log("[Push Notifications] FCM Token acquired:", token);
        localStorage.setItem("iitp_fcm_token", token);
        localStorage.setItem("iitp_notifications_enabled", "true");

        // Send token to admin backend to subscribe to announcements topic
        await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            token: token,
            email: window.currentUserEmail || null
          })
        }).catch(e => console.warn("Failed to sync token with backend:", e));

        if (showFeedback) {
          showInAppToast("Notifications Active! 🔔", "You will now receive all college announcements on your phone.");
        }
      }
    } catch (err) {
      console.error("[Push Notifications] Subscription error:", err);
      if (showFeedback) {
        showInAppToast("Notification Notice", "Permission allowed. Device will receive announcements.");
      }
    }
  } else if (permission === "denied") {
    if (showFeedback) {
      alert("Notifications are blocked in your browser settings. Please allow notifications for this site to receive college announcements.");
    }
  }
}

function updateUI(permission) {
  const notifyBtn = document.getElementById("notifyBtn");
  const promptBanner = document.getElementById("pushPromptBanner");

  if (permission === "granted") {
    if (notifyBtn) {
      notifyBtn.innerHTML = "🔔 Alerts: On";
      notifyBtn.style.background = "rgba(34, 197, 94, 0.2)";
      notifyBtn.style.borderColor = "rgba(34, 197, 94, 0.5)";
      notifyBtn.title = "Announcements enabled. Click to verify.";
    }
    if (promptBanner) promptBanner.style.display = "none";
  } else {
    if (notifyBtn) {
      notifyBtn.innerHTML = "🔔 Alerts";
      notifyBtn.style.background = "rgba(255, 255, 255, 0.15)";
      notifyBtn.style.borderColor = "rgba(255, 255, 255, 0.3)";
    }
    const dismissed = localStorage.getItem("iitp_push_prompt_dismissed");
    if (promptBanner && !dismissed && permission === "default") {
      promptBanner.style.display = "flex";
    }
  }
}

function showInAppToast(title, message) {
  let toast = document.getElementById("iitpAnnouncementToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "iitpAnnouncementToast";
    toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 99999; background: #0f3d91; color: white; padding: 14px 20px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.25); max-width: 360px; font-size: 14px; display: flex; flex-direction: column; gap: 4px; border-left: 5px solid #22c55e; transition: all 0.3s ease;";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<strong style="font-size: 15px; display:flex; align-items:center; gap:6px;">${title}</strong><span style="opacity:0.95; line-height: 1.4;">${message}</span>`;
  toast.style.display = "flex";
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => { toast.style.display = "none"; }, 300);
  }, 6000);
}

// Setup event listeners on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  const supported = await initMessaging();
  if (!supported) return;

  const permission = "Notification" in window ? Notification.permission : "denied";
  updateUI(permission);

  // If already granted, ensure token is refreshed and synced silently
  if (permission === "granted") {
    requestAndSubscribe(false);
  }

  // Header Bell Button
  document.getElementById("notifyBtn")?.addEventListener("click", () => {
    if (Notification.permission === "granted") {
      showInAppToast("🔔 Announcements Enabled", "Your device is subscribed to all IIT Patna announcements.");
    } else {
      requestAndSubscribe(true);
    }
  });

  // Prompt banner buttons
  document.getElementById("enablePushBtn")?.addEventListener("click", () => {
    requestAndSubscribe(true);
  });

  document.getElementById("dismissPushBtn")?.addEventListener("click", () => {
    const banner = document.getElementById("pushPromptBanner");
    if (banner) banner.style.display = "none";
    localStorage.setItem("iitp_push_prompt_dismissed", "true");
  });
});
