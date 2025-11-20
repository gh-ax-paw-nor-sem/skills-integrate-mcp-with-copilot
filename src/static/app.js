// Authentication state
let authToken = localStorage.getItem("authToken");
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const authSection = document.getElementById("auth-section");
  const mainApp = document.getElementById("main-app");
  
  // Auth elements
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const userName = document.getElementById("user-name");
  const userRole = document.getElementById("user-role");

  // Check if user is already logged in
  if (authToken) {
    verifyTokenAndLoadApp();
  }

  // Tab switching
  loginTab.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
  });

  registerTab.addEventListener("click", () => {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
  });

  // Login handler
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const messageEl = document.getElementById("login-message");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        localStorage.setItem("authToken", authToken);
        await verifyTokenAndLoadApp();
      } else {
        messageEl.textContent = result.detail || "Login failed";
        messageEl.className = "error";
        messageEl.classList.remove("hidden");
      }
    } catch (error) {
      messageEl.textContent = "Login failed. Please try again.";
      messageEl.className = "error";
      messageEl.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Register handler
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fullName = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm").value;
    const messageEl = document.getElementById("register-message");

    if (password !== confirmPassword) {
      messageEl.textContent = "Passwords do not match";
      messageEl.className = "error";
      messageEl.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: "student",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        messageEl.textContent = "Registration successful! Please login.";
        messageEl.className = "success";
        messageEl.classList.remove("hidden");
        registerForm.reset();
        
        // Switch to login tab after 2 seconds
        setTimeout(() => {
          loginTab.click();
          messageEl.classList.add("hidden");
        }, 2000);
      } else {
        messageEl.textContent = result.detail || "Registration failed";
        messageEl.className = "error";
        messageEl.classList.remove("hidden");
      }
    } catch (error) {
      messageEl.textContent = "Registration failed. Please try again.";
      messageEl.className = "error";
      messageEl.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    authSection.classList.remove("hidden");
    mainApp.classList.add("hidden");
    userInfo.classList.add("hidden");
    loginForm.reset();
    registerForm.reset();
  });

  // Verify token and load app
  async function verifyTokenAndLoadApp() {
    try {
      const response = await fetch("/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        currentUser = await response.json();
        userName.textContent = currentUser.full_name;
        userRole.textContent = currentUser.role.toUpperCase();
        userRole.className = `role-badge role-${currentUser.role}`;
        
        authSection.classList.add("hidden");
        mainApp.classList.remove("hidden");
        userInfo.classList.remove("hidden");
        
        // Load app content
        fetchActivities();
        
        // Show admin panel if admin
        if (currentUser.role === "admin") {
          document.getElementById("admin-panel").classList.remove("hidden");
          loadUsers();
        }
      } else {
        // Token is invalid
        logout();
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      logout();
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    authSection.classList.remove("hidden");
    mainApp.classList.add("hidden");
    userInfo.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error("Failed to fetch activities");
      }
      
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Check if current user is signed up
        const isSignedUp = currentUser && details.participants.includes(currentUser.email);

        // Create participants HTML
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentUser && email === currentUser.email
                          ? '<button class="delete-btn" data-activity="' +
                            name +
                            '">Leave</button>'
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          ${
            currentUser && currentUser.role === "student" && !isSignedUp && spotsLeft > 0
              ? `<button class="signup-btn" data-activity="${name}">Sign Up</button>`
              : ""
          }
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
      
      document.querySelectorAll(".signup-btn").forEach((button) => {
        button.addEventListener("click", handleSignup);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle signup
  async function handleSignup(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Load users (admin only)
  async function loadUsers() {
    try {
      const response = await fetch("/auth/users", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const users = await response.json();
        const usersContainer = document.getElementById("users-container");
        
        usersContainer.innerHTML = users
          .map(
            (user) => `
          <div class="user-card">
            <strong>${user.full_name}</strong>
            <span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>
            <div>${user.email}</div>
            <div class="user-status ${user.is_active ? 'active' : 'inactive'}">
              ${user.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        `
          )
          .join("");
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }
});
