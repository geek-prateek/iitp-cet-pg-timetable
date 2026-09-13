import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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

const loginOverlay = document.getElementById("loginOverlay");
const mainApp = document.getElementById("mainApp");
const emailInput = document.getElementById("emailInput");
const sendLinkBtn = document.getElementById("sendLinkBtn");
const loginMessage = document.getElementById("loginMessage");

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
if (emailInput) {
    emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSendLink();
    });
}

onAuthStateChanged(auth, (user) => {
    if (user && user.email.endsWith("@iitp.ac.in")) {
        loginOverlay.style.display = "none";
        mainApp.style.display = "block";
        
        const actionsDiv = document.querySelector(".topbar .actions");
        if (actionsDiv && !document.getElementById("logoutBtn")) {
            const logoutBtn = document.createElement("button");
            logoutBtn.id = "logoutBtn";
            logoutBtn.className = "btn";
            logoutBtn.style.marginLeft = "8px";
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick = () => signOut(auth);
            actionsDiv.appendChild(logoutBtn);
        }
    } else {
        loginOverlay.style.display = "flex";
        mainApp.style.display = "none";
        if (user) {
            signOut(auth);
            showMessage("Unauthorized email domain logged out.", true);
        }
    }
});

handleIncomingLink();
