function handleOpenAuth(signupMode) {
  if (currentUser) {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("authScreen").classList.remove("open");
    document.getElementById("appShell").classList.add("active");
    document.getElementById("companyBadge").innerText = currentUser.company || "BorderFlow Workspace";
    document.getElementById("userLabel").innerText = `${currentUser.role.toUpperCase()} • ${currentUser.email}`;
    loadShipments();
    return;
  }
  isSignup = !!signupMode;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authScreen").classList.add("open");
}

document.querySelectorAll(".js-open-login").forEach(el => el.addEventListener("click", () => handleOpenAuth(false)));
document.querySelectorAll(".js-open-signup").forEach(el => el.addEventListener("click", () => handleOpenAuth(true)));
document.getElementById("closeAuthBtn").addEventListener("click", () => document.getElementById("authScreen").classList.remove("open"));
