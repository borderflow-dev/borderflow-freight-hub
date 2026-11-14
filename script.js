window.openLogin = function(signupMode) {
  if (currentUser) return checkAuth();
  isSignup = !!signupMode;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authScreen").classList.add("open");
};
