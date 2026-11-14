window.openLogin = function(signupMode) {
  if (currentUser) {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("authScreen").classList.remove("open");
    document.getElementById("appShell").classList.add("active");
    loadShipments();
    return;
  }
  isSignup = !!signupMode;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authScreen").classList.add("open");
};
