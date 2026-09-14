import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut, signInWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyzGm22sstzNeLLx5aGeiV1ZsAWYWhoXg",
  authDomain: "iitp-timetable.firebaseapp.com",
  projectId: "iitp-timetable",
  storageBucket: "iitp-timetable.firebasestorage.app",
  messagingSenderId: "731679222233",
  appId: "1:731679222233:web:44223a8b0c0d690a2291c8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.getFirebaseToken = async () => {
    return auth.currentUser ? await auth.currentUser.getIdToken() : null;
};

const loginOverlay = document.getElementById("loginOverlay");
const mainApp = document.getElementById("mainApp");
const emailInput = document.getElementById("emailInput");
const sendLinkBtn = document.getElementById("sendLinkBtn");
const loginMessage = document.getElementById("loginMessage");
const profileOverlay = document.getElementById("profileOverlay");
const saveProfileBtn = document.getElementById("saveProfileBtn");

let currentUserDoc = null;
let unsubChat = null;

function showMessage(msg, isError = false) {
    if (!loginMessage) return;
    loginMessage.textContent = msg;
    loginMessage.style.color = isError ? "#dc2626" : "#16a34a";
}

async function handleSendLink() {
    const email = emailInput.value.trim().toLowerCase();
    
    if (!email) {
        showMessage("Please enter your email.", true);
        return;
    }
    if (!email.endsWith("@iitp.ac.in")) {
        showMessage("Access denied. Only @iitp.ac.in emails are allowed.", true);
        return;
    }

    sendLinkBtn.disabled = true;
    sendLinkBtn.textContent = "Sending...";

    const actionCodeSettings = {
        url: window.location.href.split('?')[0],
        handleCodeInApp: true
    };

    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        showMessage("Login link sent! Please check your inbox (and spam folder).");
        emailInput.value = "";
    } catch (error) {
        console.error("Auth Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            showMessage("Error: This domain is not authorized in Firebase.", true);
        } else {
            showMessage(error.message, true);
        }
    } finally {
        sendLinkBtn.disabled = false;
        sendLinkBtn.textContent = "Send Login Link";
    }
}

async function handleIncomingLink() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        loginOverlay.style.display = "flex";
        mainApp.style.display = "none";
        profileOverlay.style.display = "none";
        
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt("Please confirm your email address to complete sign-in:");
        }

        if (email && email.endsWith("@iitp.ac.in")) {
            try {
                showMessage("Verifying link...", false);
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                window.history.replaceState(null, "", window.location.pathname);
                
                // Show the password prompt modal
                const promptModal = document.getElementById('passwordPromptModal');
                if (promptModal) {
                    promptModal.style.display = 'flex';
                }

            } catch (error) {
                console.error("Sign-in Error:", error);
                showMessage("Error signing in. The link might have expired.", true);
            }
        } else {
            showMessage("Access denied. Only @iitp.ac.in emails are allowed.", true);
        }
    }
}

if (sendLinkBtn) {
    sendLinkBtn.addEventListener("click", handleSendLink);
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Prevent page reload
        
        const email = emailInput.value.trim().toLowerCase();
        const passwordInput = document.getElementById("loginPassword");
        const password = passwordInput ? passwordInput.value : "";
        const loginWithPasswordBtn = document.getElementById("loginWithPasswordBtn");
        
        if (!email || !password) {
            showMessage("Please enter both email and password.", true);
            return;
        }
        if (!email.endsWith("@iitp.ac.in")) {
            showMessage("Access denied. Only @iitp.ac.in emails are allowed.", true);
            return;
        }

        if (loginWithPasswordBtn) {
            loginWithPasswordBtn.disabled = true;
            loginWithPasswordBtn.textContent = "Logging in...";
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage("Login successful!");
        } catch (error) {
            console.error("Password Login Error:", error);
            showMessage("Invalid email or password. Use Magic Link if you haven't set a password.", true);
        } finally {
            if (loginWithPasswordBtn) {
                loginWithPasswordBtn.disabled = false;
                loginWithPasswordBtn.textContent = "Login";
            }
        }
    });
}

const profilePasswordForm = document.getElementById("profilePasswordForm");
if (profilePasswordForm) {
    profilePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const passInput = document.getElementById("profileSetupPassword");
        const msgEl = document.getElementById("passwordMessage");
        const setPasswordBtn = document.getElementById("setPasswordBtn");
        if (!passInput || !msgEl) return;

        const newPassword = passInput.value;
        if (newPassword.length < 6) {
            msgEl.textContent = "Password must be at least 6 characters.";
            msgEl.style.color = "#dc2626";
            return;
        }

        if (setPasswordBtn) {
            setPasswordBtn.disabled = true;
            setPasswordBtn.textContent = "Saving...";
        }
        
        try {
            await updatePassword(auth.currentUser, newPassword);
            msgEl.textContent = "Password set successfully! You can use it next time.";
            msgEl.style.color = "#16a34a";
            passInput.value = "";
        } catch (error) {
            console.error("Error setting password:", error);
            if (error.code === 'auth/requires-recent-login') {
                msgEl.textContent = "Please logout and login with Magic Link again to set a password.";
            } else {
                msgEl.textContent = "Error setting password. Try again.";
            }
            msgEl.style.color = "#dc2626";
        } finally {
            if (setPasswordBtn) {
                setPasswordBtn.disabled = false;
                setPasswordBtn.textContent = "Save Password";
            }
        }
    });
}

const promptPasswordForm = document.getElementById("promptPasswordForm");
const promptSkipBtn = document.getElementById("promptSkipBtn");
const passwordPromptModal = document.getElementById("passwordPromptModal");

if (promptSkipBtn && passwordPromptModal) {
    promptSkipBtn.addEventListener("click", () => {
        passwordPromptModal.style.display = "none";
    });
}

if (promptPasswordForm && passwordPromptModal) {
    promptPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const passInput = document.getElementById("promptSetupPassword");
        const msgEl = document.getElementById("promptPasswordMessage");
        const promptSetPasswordBtn = document.getElementById("promptSetPasswordBtn");
        if (!passInput || !msgEl) return;

        const newPassword = passInput.value;
        if (newPassword.length < 6) {
            msgEl.textContent = "Password must be at least 6 characters.";
            msgEl.style.color = "#dc2626";
            return;
        }

        if (promptSetPasswordBtn) {
            promptSetPasswordBtn.disabled = true;
            promptSetPasswordBtn.textContent = "Saving...";
        }
        
        try {
            await updatePassword(auth.currentUser, newPassword);
            msgEl.textContent = "Success! You can use it next time.";
            msgEl.style.color = "#16a34a";
            setTimeout(() => {
                passwordPromptModal.style.display = "none";
            }, 1500);
        } catch (error) {
            console.error("Error setting password:", error);
            msgEl.textContent = "Error setting password. Try again.";
            msgEl.style.color = "#dc2626";
            if (promptSetPasswordBtn) {
                promptSetPasswordBtn.disabled = false;
                promptSetPasswordBtn.textContent = "Set Password";
            }
        }
    });
}

const specOptions = {
    "M.Tech": [
        "AI & DSE",
        "Computer Science and Engineering",
        "Cloud Computing",
        "Blockchain Technology and Big Data"
    ],
    "M.S.": [
        "Computer Science and Data Analytics",
        "Artificial Intelligence and Cyber Security"
    ]
};

const profileDegree = document.getElementById("profileDegree");
const profileSpec = document.getElementById("profileSpec");
const profileSession = document.getElementById("profileSession");

if (profileDegree && profileSpec) {
    profileDegree.addEventListener("change", (e) => {
        const degree = e.target.value;
        const options = specOptions[degree] || [];
        
        profileSpec.innerHTML = '<option value="" disabled selected>Select Specialization</option>';
        options.forEach(opt => {
            const el = document.createElement("option");
            el.value = opt;
            el.textContent = opt;
            profileSpec.appendChild(el);
        });
        profileSpec.disabled = false;
        profileSpec.style.backgroundColor = "white";
    });
}

// Profile Save Logic
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        const degree = profileDegree.value;
        const spec = profileSpec.value;
        const session = profileSession.value;

        if (!degree || !spec || !session) {
            alert("Please fill in all fields.");
            return;
        }
        
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving...";

        const createSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
        const batchGroupId = `chat_${createSlug(degree)}_${createSlug(spec)}_${createSlug(session)}`;

        const profileData = {
            email: user.email,
            degree,
            specialization: spec,
            admissionSession: session,
            batchGroupId,
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "users", user.uid), profileData);
            
            // FIX: Update local memory so opening settings works immediately
            currentUserDoc = profileData;
            window.initChatListener();
            
            profileOverlay.style.display = "none";
            mainApp.style.display = "block";
            
            // Reload data securely
            const token = await user.getIdToken();
            if (typeof window.loadSecureData === "function") {
                window.loadSecureData(token);
            }
        } catch (err) {
            console.error("Error saving profile:", err);
            alert("Failed to save profile. Make sure Firestore is enabled.");
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Join Class Group";
        }
    });
}

function formatMessageText(text) {
    // 1. Escape HTML to prevent XSS attacks (Security)
    const div = document.createElement("div");
    div.textContent = text;
    const escapedText = div.innerHTML;

    // 2. Convert URLs into clickable anchor tags
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return escapedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; word-break: break-all;">$1</a>');
}

let chatInitialized = false;

window.initChatListener = () => {
    if (!currentUserDoc || chatInitialized) return;
    
    // Request Browser Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    const chatGroupName = document.getElementById("chatGroupName");
    const chatMessages = document.getElementById("chatMessages");
    chatGroupName.textContent = `${currentUserDoc.degree} - ${currentUserDoc.specialization}`;
    
    const q = query(collection(db, "chats", currentUserDoc.batchGroupId, "messages"), orderBy("timestamp"));
    
    let isInitialLoad = true;
    chatInitialized = true;
    
    unsubChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = "";
        if (snapshot.empty) {
            chatMessages.innerHTML = `<p class="muted" style="text-align: center; font-size: 0.9rem; margin-top: 20px;">Welcome to your class group! Send a message to start.</p>`;
            isInitialLoad = false;
            return;
        }
        
        let hasNewExternalMessage = false;
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isMe = data.email === auth.currentUser.email;
            const rollNumber = data.email.split('@')[0];
            
            // Check for notifications
            if (!isInitialLoad && !isMe) {
                // If this specific doc is new (since last snapshot)
                // Firestore snapshot sends all docs, but we can rely on isInitialLoad
                // for basic notification when the DB updates.
                hasNewExternalMessage = true;
            }
            
            const bubble = document.createElement("div");
            bubble.style.cssText = `max-width: 75%; padding: 10px 14px; border-radius: 12px; margin-bottom: 4px; display: inline-block; word-wrap: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.1);`;
            
            if (isMe) {
                bubble.style.background = "#dcf8c6";
                bubble.style.alignSelf = "flex-end";
                bubble.style.borderBottomRightRadius = "0";
            } else {
                bubble.style.background = "white";
                bubble.style.alignSelf = "flex-start";
                bubble.style.borderBottomLeftRadius = "0";
            }
            
            let html = "";
            if (!isMe) {
                html += `<div style="font-size: 0.75rem; color: var(--navy); font-weight: bold; margin-bottom: 4px;">${rollNumber}</div>`;
            }
            
            const safeFormattedText = formatMessageText(data.text);
            html += `<div style="font-size: 0.95rem; line-height: 1.4;">${safeFormattedText}</div>`;
            
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                const timeString = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                html += `<div style="font-size: 0.65rem; color: #667781; text-align: right; margin-top: 4px;">${timeString}</div>`;
            }
            
            bubble.innerHTML = html;
            chatMessages.appendChild(bubble);
        });
        
        // Handle Notifications if chat is hidden
        const chatOverlay = document.getElementById("chatOverlay");
        if (hasNewExternalMessage && chatOverlay.style.display !== "flex") {
            const chatBtn = document.getElementById("chatHeaderBtn");
            if (chatBtn) {
                chatBtn.innerHTML = `💬 Class Chat <span style="background: #ef4444; color: white; border-radius: 12px; padding: 2px 6px; font-size: 11px; margin-left: 4px; font-weight: bold;">New</span>`;
            }
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("New message in Class Chat", {
                    body: "Check the timetable portal to reply.",
                    icon: "assets/iitp-seal.png"
                });
            }
        } else if (chatOverlay.style.display === "flex") {
            // Scroll to bottom immediately if open
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        isInitialLoad = false;
    });
};

window.openChat = () => {
    if (!currentUserDoc) {
        document.getElementById("profileOverlay").style.display = "flex";
    } else {
        const chatOverlay = document.getElementById("chatOverlay");
        chatOverlay.style.display = "flex";
        
        // Remove the New notification badge
        const chatBtn = document.getElementById("chatHeaderBtn");
        if (chatBtn) chatBtn.innerHTML = "💬 Class Chat";
        
        // Scroll to bottom
        const chatMessages = document.getElementById("chatMessages");
        setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 100);
    }
};

const viewMembersBtn = document.getElementById("viewMembersBtn");
if (viewMembersBtn) {
    viewMembersBtn.addEventListener("click", async () => {
        const overlay = document.getElementById("membersOverlay");
        overlay.style.display = "flex";
        const list = document.getElementById("membersList");
        list.innerHTML = "<p class='muted' style='text-align: center; margin-top: 20px;'>Loading members...</p>";
        
        try {
            const q = query(collection(db, "users"), where("batchGroupId", "==", currentUserDoc.batchGroupId));
            const snap = await getDocs(q);
            list.innerHTML = "";
            
            if (snap.empty) {
                list.innerHTML = "<p class='muted'>No members found.</p>";
                return;
            }
            
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const emailPrefix = data.email.split('@')[0];
                const isMe = data.email === auth.currentUser.email;
                const initial = emailPrefix.substring(0, 2).toUpperCase();
                
                list.innerHTML += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--navy); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">
                        ${initial}
                    </div>
                    <div style="font-size: 0.95rem; font-weight: 500; color: #334155;">
                        ${emailPrefix} ${isMe ? "<span style='color: #64748b; font-size: 0.8rem;'>(You)</span>" : ""}
                    </div>
                </div>`;
            });
        } catch(err) {
            console.error(err);
            list.innerHTML = "<p style='color: red; text-align: center;'>Failed to load members.</p>";
        }
    });
}

const sendChatBtn = document.getElementById("sendChatBtn");
if (sendChatBtn) {
    sendChatBtn.addEventListener("click", async () => {
        const input = document.getElementById("chatInput");
        const text = input.value.trim();
        if (!text || !currentUserDoc) return;
        
        input.value = "";
        
        try {
            await addDoc(collection(db, "chats", currentUserDoc.batchGroupId, "messages"), {
                text: text,
                email: auth.currentUser.email,
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    });
    
    document.getElementById("chatInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendChatBtn.click();
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user && user.email.endsWith("@iitp.ac.in")) {
        loginOverlay.style.display = "none";
        
        // Populate hidden email fields for password manager autofill
        const promptHiddenEmail = document.getElementById("promptHiddenEmail");
        if (promptHiddenEmail) promptHiddenEmail.value = user.email;
        const profileHiddenEmail = document.getElementById("profileHiddenEmail");
        if (profileHiddenEmail) profileHiddenEmail.value = user.email;

        try {
            // Always show timetable immediately after login
            mainApp.style.display = "block";
            const token = await user.getIdToken();
            if (typeof window.loadSecureData === "function") {
                window.loadSecureData(token);
            }

            // Silently check if they have a profile
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                currentUserDoc = userSnap.data();
                window.initChatListener();
            }
        } catch (err) {
            console.error("Firestore error:", err);
        }
        
        const actionsDiv = document.querySelector(".hero-content .actions");
        if (actionsDiv && !document.getElementById("profileSettingsBtn")) {
            const profileBtn = document.createElement("button");
            profileBtn.id = "profileSettingsBtn";
            profileBtn.className = "btn";
            profileBtn.style.padding = "8px 14px";
            profileBtn.style.fontSize = "14px";
            profileBtn.style.display = "flex";
            profileBtn.style.alignItems = "center";
            profileBtn.style.gap = "6px";
            profileBtn.innerHTML = "⚙️ Profile";
            profileBtn.onclick = () => {
                if (currentUserDoc) {
                    profileDegree.value = currentUserDoc.degree;
                    profileDegree.dispatchEvent(new Event('change')); // trigger dynamic spec update
                    profileSpec.value = currentUserDoc.specialization;
                    profileSession.value = currentUserDoc.admissionSession;
                    saveProfileBtn.textContent = "Update Profile";
                }
                document.getElementById("profileOverlay").style.display = "flex";
            };
            actionsDiv.appendChild(profileBtn);
        }

        if (actionsDiv && !document.getElementById("logoutBtn")) {
            const logoutBtn = document.createElement("button");
            logoutBtn.id = "logoutBtn";
            logoutBtn.className = "btn";
            logoutBtn.style.padding = "8px 14px";
            logoutBtn.style.fontSize = "14px";
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick = () => {
                currentUserDoc = null;
                signOut(auth);
            };
            actionsDiv.appendChild(logoutBtn);
        }
    } else {
        loginOverlay.style.display = "flex";
        mainApp.style.display = "none";
        profileOverlay.style.display = "none";
        currentUserDoc = null;
        if (user) {
            signOut(auth);
            showMessage("Unauthorized email domain logged out.", true);
        }
    }
});

handleIncomingLink();
