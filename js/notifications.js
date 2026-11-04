// IIT Patna Timetable - Client Push Notifications & Class Reminders
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
const VAPID_KEY = window.IITP_VAPID_KEY || "BODJ38CnN2K2-9_2z2ItQu3GmySmQYKMN1ZbLaodPICjBrdHJgSGQ0ggCwR8OYobrSsYAaUVShEm-KiDiUl7otQ";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let messaging = null;
let swRegistration = null;

// Initialize Firebase Messaging & Service Worker
async function initMessaging() {
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.log("[Push Notifications] Not supported in this browser.");
    return false;
  }

  try {
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register("firebase-messaging-sw.js", { scope: "/" });
    }

    messaging = getMessaging(app);

    // Foreground listener for live announcements
    onMessage(messaging, (payload) => {
      console.log("[Push Notifications] Live message received:", payload);
      const isAnnouncementsEnabled = localStorage.getItem("iitp_announcements_enabled") !== "false";
      if (!isAnnouncementsEnabled) return; // Muted by user

      const title = payload.notification?.title || payload.data?.title || "📢 IIT Patna Announcement";
      const body = payload.notification?.body || payload.data?.message || payload.data?.body;

      if (body) {
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

// Request permission and subscribe device token
async function requestAndSubscribe(showFeedback = true) {
  if (!("Notification" in window)) {
    if (showFeedback) alert("This browser does not support notifications.");
    return false;
  }

  const permission = await Notification.requestPermission();
  updateUI(permission);

  if (permission === "granted") {
    try {
      if (!messaging) await initMessaging();
      if (!messaging) return false;

      const tokenOptions = { serviceWorkerRegistration: swRegistration };
      if (VAPID_KEY) tokenOptions.vapidKey = VAPID_KEY;

      const token = await getToken(messaging, tokenOptions);
      if (token) {
        localStorage.setItem("iitp_fcm_token", token);
        localStorage.setItem("iitp_announcements_enabled", "true");

        // Sync with backend announcements topic
        await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            token: token,
            email: window.currentUserEmail || null
          })
        }).catch(e => console.warn("Backend subscription sync warning:", e));

        if (showFeedback) {
          showInAppToast("Notifications Enabled! 🔔", "You will now receive announcements and class reminders.");
        }
        return true;
      }
    } catch (err) {
      console.error("[Push Notifications] Token error:", err);
      if (showFeedback) {
        showInAppToast("Notification Notice", "Permission granted. Notifications active.");
      }
      return true;
    }
  } else if (permission === "denied") {
    if (showFeedback) {
      alert("Notifications are blocked in your browser. Please allow notifications in site settings to enable alerts.");
    }
    return false;
  }
  return false;
}

// Toggle Announcements ON / OFF
async function toggleAnnouncements(enable) {
  const token = localStorage.getItem("iitp_fcm_token");

  if (enable) {
    if (Notification.permission !== "granted") {
      const granted = await requestAndSubscribe(true);
      if (!granted) {
        document.getElementById("toggleAnnouncements").checked = false;
        return;
      }
    } else {
      localStorage.setItem("iitp_announcements_enabled", "true");
      if (token) {
        fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "subscribe", token })
        }).catch(() => {});
      }
      showInAppToast("📢 Announcements On", "You will receive college announcements.");
    }
  } else {
    // Turn OFF / Mute Announcements
    localStorage.setItem("iitp_announcements_enabled", "false");
    if (token) {
      fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", token })
      }).catch(() => {});
    }
    showInAppToast("🔕 Announcements Muted", "College announcements will not trigger pop-up alerts.");
  }
  updateUI(Notification.permission);
}

// Toggle Class Reminders ON / OFF
async function toggleClassReminders(enable) {
  if (enable) {
    if (Notification.permission !== "granted") {
      const granted = await requestAndSubscribe(true);
      if (!granted) {
        document.getElementById("toggleClassReminders").checked = false;
        return;
      }
    }
    localStorage.setItem("iitp_class_reminders_enabled", "true");
    const mins = localStorage.getItem("iitp_class_reminder_minutes") || "10";
    showInAppToast("⏰ Class Reminders On", `You will be alerted ${mins} minutes before each class.`);
  } else {
    localStorage.setItem("iitp_class_reminders_enabled", "false");
    showInAppToast("⏰ Class Reminders Off", "Class reminders have been disabled.");
  }
  updateUI(Notification.permission);
}

// Update UI Buttons and Modal
function updateUI(permission) {
  const notifyBtn = document.getElementById("notifyBtn");
  const promptBanner = document.getElementById("pushPromptBanner");
  const toggleAnnounceEl = document.getElementById("toggleAnnouncements");
  const toggleRemindEl = document.getElementById("toggleClassReminders");
  const remindMinsEl = document.getElementById("classReminderMinutes");

  const announcementsOn = localStorage.getItem("iitp_announcements_enabled") !== "false";
  const remindersOn = localStorage.getItem("iitp_class_reminders_enabled") !== "false";
  const reminderMinutes = localStorage.getItem("iitp_class_reminder_minutes") || "10";

  if (toggleAnnounceEl) toggleAnnounceEl.checked = permission === "granted" && announcementsOn;
  if (toggleRemindEl) toggleRemindEl.checked = permission === "granted" && remindersOn;
  if (remindMinsEl) remindMinsEl.value = reminderMinutes;

  if (permission === "granted") {
    if (notifyBtn) {
      if (announcementsOn || remindersOn) {
        notifyBtn.innerHTML = "🔔 Alerts: On";
        notifyBtn.style.background = "rgba(34, 197, 94, 0.2)";
        notifyBtn.style.borderColor = "rgba(34, 197, 94, 0.5)";
      } else {
        notifyBtn.innerHTML = "🔕 Alerts: Off";
        notifyBtn.style.background = "rgba(255, 255, 255, 0.1)";
        notifyBtn.style.borderColor = "rgba(255, 255, 255, 0.25)";
      }
      notifyBtn.title = "Click to configure alerts and reminders";
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

// Parse Clock Time Helper (e.g. "9:00 AM" -> 540 minutes from midnight)
function parseClockMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return (hours * 60) + minutes;
}

function parseStartMinutes(timeRangeStr) {
  const parts = String(timeRangeStr || "").split(/\s*[–-]\s*/);
  return parts[0] ? parseClockMinutes(parts[0]) : null;
}

// ⏰ Check Upcoming Classes and Trigger Local Reminders
function checkUpcomingClassReminders() {
  if (localStorage.getItem("iitp_class_reminders_enabled") === "false") return;
  if (Notification.permission !== "granted") return;
  if (typeof window.SCHEDULE === "undefined" || !window.SCHEDULE.length) return;

  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderMinutes = parseInt(localStorage.getItem("iitp_class_reminder_minutes") || "10", 10);

  const selectedProg = localStorage.getItem("iitp-ai-dse-program") || "mtech-ai-dse";
  const selectedElec = localStorage.getItem("iitp-ai-dse-elective") || "cda";

  // Filter classes for today
  const todayClasses = window.SCHEDULE.filter(item => {
    if (item.day !== dayName || item.cancelled) return false;
    const course = (window.COURSES || []).find(c => c.id === item.course);
    if (!course) return false;
    return course.type === "regular" || item.course === selectedElec;
  });

  todayClasses.forEach(item => {
    const course = (window.COURSES || []).find(c => c.id === item.course);
    if (!course) return;

    const startMinutes = parseStartMinutes(item.time);
    if (startMinutes === null) return;

    const diff = startMinutes - currentMinutes;

    // Trigger reminder when class is exactly reminderMinutes away (or within 1 min tolerance)
    if (diff === reminderMinutes || diff === reminderMinutes - 1) {
      const reminderKey = `class_reminded_${item.course}_${dayName}_${item.time}_${now.toDateString()}`;
      if (!sessionStorage.getItem(reminderKey)) {
        sessionStorage.setItem(reminderKey, "true");
        fireClassReminder(course, item, reminderMinutes);
      }
    }
  });
}

// Fire class reminder notification
function fireClassReminder(course, item, minutesBefore) {
  const title = `⏰ Class in ${minutesBefore} mins: ${course.shortName}`;
  const body = `${item.time} • ${course.name}${course.professor ? " (" + course.professor + ")" : ""}${item.lab ? " · Lab" : ""}`;

  // Native push / service worker notification
  if (swRegistration && "showNotification" in swRegistration) {
    swRegistration.showNotification(title, {
      body,
      icon: "/assets/iitp-seal.png",
      badge: "/assets/app-icon.svg",
      tag: `class-${item.course}-${item.time}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: course.moodleUrl || "/" }
    });
  } else if ("Notification" in window) {
    new Notification(title, { body, icon: "/assets/iitp-seal.png" });
  }

  showInAppToast(title, body);
}

// 📅 Download .ics Calendar File with 10-Min Pre-Set Alarms
function downloadClassCalendarIcs() {
  if (typeof window.SCHEDULE === "undefined" || !window.SCHEDULE.length) {
    alert("Timetable data is still loading. Please try again in a moment.");
    return;
  }

  const selectedProg = localStorage.getItem("iitp-ai-dse-program") || "mtech-ai-dse";
  const selectedElec = localStorage.getItem("iitp-ai-dse-elective") || "cda";
  const reminderMinutes = parseInt(localStorage.getItem("iitp_class_reminder_minutes") || "10", 10);

  const dayToRRule = {
    "Monday": "MO", "Tuesday": "TU", "Wednesday": "WE", "Thursday": "TH", "Friday": "FR", "Saturday": "SA", "Sunday": "SU"
  };

  const userClasses = window.SCHEDULE.filter(item => {
    const course = (window.COURSES || []).find(c => c.id === item.course);
    if (!course) return false;
    return course.type === "regular" || item.course === selectedElec;
  });

  if (!userClasses.length) {
    alert("No classes found for the selected program and elective.");
    return;
  }

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IIT Patna//Timetable Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:IIT Patna Classes"
  ];

  userClasses.forEach((item, idx) => {
    const course = (window.COURSES || []).find(c => c.id === item.course);
    const timeParts = String(item.time || "").split(/\s*[–-]\s*/);
    const startMin = parseClockMinutes(timeParts[0]);
    const endMin = parseClockMinutes(timeParts[1]) || (startMin + 90);

    if (startMin === null) return;

    const startH = String(Math.floor(startMin / 60)).padStart(2, "0");
    const startM = String(startMin % 60).padStart(2, "0");
    const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
    const endM = String(endMin % 60).padStart(2, "0");

    const rruleDay = dayToRRule[item.day] || "MO";

    icsContent.push(
      "BEGIN:VEVENT",
      `UID:iitp-class-${item.course}-${item.day}-${startMin}-${idx}@iitp.ac.in`,
      "DTSTAMP:20260101T000000Z",
      `DTSTART;TZID=Asia/Kolkata:20260801T${startH}${startM}00`,
      `DTEND;TZID=Asia/Kolkata:20260801T${endH}${endM}00`,
      `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`,
      `SUMMARY:🎓 ${course.shortName}${item.lab ? " (Lab)" : ""}`,
      `DESCRIPTION:${course.name}\\nFaculty: ${course.professor || "IIT Patna"}\\nMoodle: ${course.moodleUrl || "N/A"}`,
      "LOCATION:IIT Patna / MS Teams",
      "BEGIN:VALARM",
      `TRIGGER:-PT${reminderMinutes}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:Class in ${reminderMinutes} mins: ${course.shortName}`,
      "END:VALARM",
      "END:VEVENT"
    );
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "iitp-classes-schedule.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showInAppToast("📅 Calendar Downloaded", "Open the downloaded .ics file to add alarms to your Google/Phone Calendar.");
}

// Expose globally so anyone can download calendar without sign-in
window.downloadClassCalendarIcs = downloadClassCalendarIcs;


// In-app visual notification toast
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

// DOM Setup
document.addEventListener("DOMContentLoaded", async () => {
  await initMessaging();

  const permission = "Notification" in window ? Notification.permission : "denied";
  updateUI(permission);

  if (permission === "granted") {
    requestAndSubscribe(false);
  }

  // Header Bell Button: opens Settings Modal if allowed, or prompts permission
  document.getElementById("notifyBtn")?.addEventListener("click", () => {
    if (Notification.permission === "granted") {
      const modal = document.getElementById("alertSettingsModal");
      if (modal) modal.showModal();
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

  // Modal Toggles & Controls
  document.getElementById("toggleAnnouncements")?.addEventListener("change", (e) => {
    toggleAnnouncements(e.target.checked);
  });

  document.getElementById("toggleClassReminders")?.addEventListener("change", (e) => {
    toggleClassReminders(e.target.checked);
  });

  document.getElementById("classReminderMinutes")?.addEventListener("change", (e) => {
    localStorage.setItem("iitp_class_reminder_minutes", e.target.value);
    showInAppToast("⏰ Preference Saved", `Reminders will trigger ${e.target.value} minutes before class.`);
  });

  document.getElementById("downloadCalendarBtn")?.addEventListener("click", () => {
    downloadClassCalendarIcs();
  });

  // Run class reminder check every 30 seconds
  setInterval(checkUpcomingClassReminders, 30000);
  setTimeout(checkUpcomingClassReminders, 3000);
});
