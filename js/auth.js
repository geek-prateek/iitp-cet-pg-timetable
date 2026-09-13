const msalConfig = {
    auth: {
        // 🛑 REPLACE THIS WITH YOUR AZURE APP CLIENT ID 🛑
        clientId: "YOUR_CLIENT_ID_HERE", 
        // "common" allows any Microsoft account to log in (we filter by domain below)
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

async function handleLogin() {
    const errorMsg = document.getElementById("loginErrorMsg");
    const btn = document.getElementById("msLoginBtn");
    
    errorMsg.textContent = "";
    btn.textContent = "Logging in...";
    btn.disabled = true;
    
    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["user.read"]
        });
        
        const email = loginResponse.account.username.toLowerCase();
        
        if (email.endsWith("@iitp.ac.in")) {
            // Success!
            document.getElementById("loginOverlay").style.display = "none";
            document.getElementById("mainApp").style.display = "block";
        } else {
            // Wrong domain - kick them out
            await msalInstance.logoutPopup();
            errorMsg.textContent = "Access denied! Only @iitp.ac.in emails are allowed.";
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = "Login failed or was cancelled.";
    } finally {
        btn.textContent = "Login with Microsoft";
        btn.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Check if already logged in from previous session
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        const email = accounts[0].username.toLowerCase();
        if (email.endsWith("@iitp.ac.in")) {
            document.getElementById("loginOverlay").style.display = "none";
            document.getElementById("mainApp").style.display = "block";
        } else {
            document.getElementById("loginOverlay").style.display = "flex";
            document.getElementById("mainApp").style.display = "none";
        }
    } else {
        document.getElementById("loginOverlay").style.display = "flex";
        document.getElementById("mainApp").style.display = "none";
    }

    document.getElementById("msLoginBtn").addEventListener("click", handleLogin);
});
