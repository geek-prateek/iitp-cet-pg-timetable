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

const createSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

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

    // Check cooldown
    const cooldownUntil = window.localStorage.getItem('magicLinkCooldown');
    if (cooldownUntil && Date.now() < parseInt(cooldownUntil)) {
        const remainingSeconds = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 1000);
        showMessage(`Please wait ${remainingSeconds} seconds before sending another link.`, true);
        return;
    }

    sendLinkBtn.disabled = true;
    sendLinkBtn.textContent = "Sending...";

    const actionCodeSettings = {
        url: window.location.href.split('?')[0],
        handleCodeInApp: true
    };

    let success = false;
    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        // Set a 2-minute cooldown to prevent spamming the quota
        window.localStorage.setItem('magicLinkCooldown', Date.now() + 120000);
        showMessage("Login link sent! Please check your inbox (and spam folder).");
        emailInput.value = "";
        success = true;
    } catch (error) {
        console.error("Auth Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            showMessage("Error: This domain is not authorized in Firebase.", true);
        } else {
            showMessage(error.message, true);
        }
    } finally {
        if (success) {
            sendLinkBtn.textContent = "Check your email";
        } else {
            sendLinkBtn.disabled = false;
            sendLinkBtn.textContent = "Send Magic Link";
        }
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
            // Teams loaded on demand
            
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

window.openTeamsGroup = () => {
    if (!currentUserDoc) {
        document.getElementById("profileOverlay").style.display = "flex";
    } else {
        const teamsOverlay = document.getElementById("teamsOverlay");
        teamsOverlay.style.display = "flex";
        loadTeamsGroup();
    }
};

async function loadTeamsGroup() {
    const teamsContent = document.getElementById("teamsContent");
    const teamsGroupName = document.getElementById("teamsGroupName");
    
    if (!currentUserDoc) return;
    
    teamsGroupName.textContent = `${currentUserDoc.degree} - ${currentUserDoc.specialization} (${currentUserDoc.session || '2026-27'})`;
    teamsContent.innerHTML = "<p class='muted'>Loading group details...</p>";
    
    try {
        const groupId = `teams_${createSlug(currentUserDoc.degree)}_${createSlug(currentUserDoc.specialization)}`;
        const groupRef = doc(db, "class_groups", groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (groupSnap.exists() && groupSnap.data().link) {
            // Group exists! Show Join button
            const link = groupSnap.data().link;
            teamsContent.innerHTML = `
                <div style="background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; width: 100%; box-sizing: border-box;">
                    <p style="color: #1e3a8a; font-weight: 500; font-size: 0.95rem; margin-bottom: 20px;">
                        An official Microsoft Teams group exists for your class!
                    </p>
                    <a href="${link}" target="_blank" rel="noopener noreferrer" style="display: block; background: #6264a7; color: white; text-decoration: none; padding: 14px 20px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Join Microsoft Teams Group
                    </a>
                </div>
            `;
        } else {
            // No group yet. Show creation prompt
            teamsContent.innerHTML = `
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #cbd5e1; width: 100%; box-sizing: border-box; text-align: left;">
                    <h3 style="margin-top: 0; color: #334155; font-size: 1.1rem;">No group exists yet!</h3>
                    <p style="color: #475569; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px;">
                        Be the first to create a Group Chat or Team in Microsoft Teams for <strong>${currentUserDoc.specialization}</strong>, and paste the Invite Link here so your classmates can join.
                    </p>
                    <input type="url" id="teamsLinkInput" placeholder="https://teams.microsoft.com/l/..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); box-sizing: border-box; margin-bottom: 12px; outline: none; font-size: 15px;" />
                    <button id="submitTeamsLinkBtn" class="btn primary" style="width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; background: var(--navy);">
                        Save Invite Link
                    </button>
                    <p id="teamsLinkError" style="color: #dc2626; font-size: 0.85rem; margin-top: 8px; display: none;"></p>
                </div>
            `;
            
            document.getElementById("submitTeamsLinkBtn").addEventListener("click", async () => {
                const input = document.getElementById("teamsLinkInput");
                const errText = document.getElementById("teamsLinkError");
                const link = input.value.trim();
                
                // Security Validation: Must be a Microsoft Teams link
                if (!/^https:\/\/teams\.microsoft\.com\/.+/i.test(link)) {
                    errText.textContent = "Invalid link! Must start with https://teams.microsoft.com/";
                    errText.style.display = "block";
                    return;
                }
                errText.style.display = "none";
                document.getElementById("submitTeamsLinkBtn").textContent = "Saving...";
                
                try {
                    await setDoc(groupRef, {
                        link: link,
                        degree: currentUserDoc.degree,
                        specialization: currentUserDoc.specialization,
                        createdBy: auth.currentUser.email,
                        createdAt: serverTimestamp()
                    });
                    loadTeamsGroup(); // Reload UI
                } catch (err) {
                    console.error(err);
                    errText.textContent = "Failed to save link. Ensure you have permissions.";
                    errText.style.display = "block";
                    document.getElementById("submitTeamsLinkBtn").textContent = "Save Invite Link";
                }
            });
        }
    } catch (err) {
        console.error("Error loading Teams group:", err);
        teamsContent.innerHTML = "<p style='color: red;'>Failed to load group details.</p>";
    }
}

let pendingAuthCallback = null;

window.requireAuth = (callback) => {
    if (auth.currentUser && currentUserDoc) {
        if (callback) callback();
    } else if (auth.currentUser && !currentUserDoc) {
        pendingAuthCallback = callback;
        document.getElementById("profileOverlay").style.display = "flex";
    } else {
        pendingAuthCallback = callback;
        document.getElementById("loginOverlay").style.display = "flex";
    }
};

window.openProfileSettings = () => {
    if (currentUserDoc) {
        profileDegree.value = currentUserDoc.degree;
        profileDegree.dispatchEvent(new Event('change'));
        profileSpec.value = currentUserDoc.specialization;
        profileSession.value = currentUserDoc.admissionSession;
        saveProfileBtn.textContent = "Update Profile";
    }
    document.getElementById("profileOverlay").style.display = "flex";
};

onAuthStateChanged(auth, async (user) => {
    const authActionBtn = document.getElementById("authActionBtn");

    if (user && user.email.endsWith("@iitp.ac.in")) {
        loginOverlay.style.display = "none";
        
        // Populate hidden email fields for password manager autofill
        const promptHiddenEmail = document.getElementById("promptHiddenEmail");
        if (promptHiddenEmail) promptHiddenEmail.value = user.email;
        const profileHiddenEmail = document.getElementById("profileHiddenEmail");
        if (profileHiddenEmail) profileHiddenEmail.value = user.email;

        try {
            const token = await user.getIdToken();
            if (typeof window.loadSecureData === "function") {
                window.loadSecureData(token);
            }

            // Silently check if they have a profile
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                currentUserDoc = userSnap.data();
                
                // Update Top Button to show Profile/Logout instead of Login
                if (authActionBtn) {
                    const initial = user.email.charAt(0).toUpperCase();
                    authActionBtn.innerHTML = `⚙️ Profile (${initial})`;
                    authActionBtn.onclick = () => window.openProfileSettings();
                }

                if (pendingAuthCallback) {
                    pendingAuthCallback();
                    pendingAuthCallback = null;
                }
            } else {
                // Force profile creation
                document.getElementById("profileOverlay").style.display = "flex";
            }
        } catch (err) {
            console.error("Firestore error:", err);
        }
        
        const actionsDiv = document.querySelector(".hero-content .actions");
        if (actionsDiv && !document.getElementById("logoutBtn")) {
            const logoutBtn = document.createElement("button");
            logoutBtn.id = "logoutBtn";
            logoutBtn.className = "btn";
            logoutBtn.style.padding = "8px 14px";
            logoutBtn.style.fontSize = "14px";
            logoutBtn.style.background = "transparent";
            logoutBtn.style.border = "1px solid rgba(255,255,255,0.4)";
            logoutBtn.style.color = "white";
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick = () => {
                currentUserDoc = null;
                signOut(auth);
            };
            actionsDiv.appendChild(logoutBtn);
        }
    } else {
        // Logged out state
        currentUserDoc = null;
        if (typeof window.clearSecureData === "function") {
            window.clearSecureData();
        }
        if (authActionBtn) {
            authActionBtn.innerHTML = `👤 Sign In`;
            authActionBtn.onclick = () => window.requireAuth(() => window.openProfileSettings());
        }
        
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) logoutBtn.remove();
        
        if (user) {
            signOut(auth);
            showMessage("Unauthorized email domain logged out.", true);
        }
    }
});

handleIncomingLink();
