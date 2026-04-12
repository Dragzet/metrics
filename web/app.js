let token = localStorage.getItem("token") || "";
let currentUser = JSON.parse(localStorage.getItem("user") || "null");
let chart;

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authError = document.getElementById("auth-error");
const userBadge = document.getElementById("user-badge");

function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}

function setSession(nextToken, user) {
  token = nextToken;
  currentUser = user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  renderAuthState();
}

function clearSession() {
  token = "";
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  renderAuthState();
}

function renderAuthState() {
  const isAuth = !!token && !!currentUser;
  authSection.classList.toggle("hidden", isAuth);
  appSection.classList.toggle("hidden", !isAuth);
  if (isAuth) {
    userBadge.textContent = `${currentUser.username} (${currentUser.role})`;
    document.getElementById("admin-users").classList.toggle("hidden", currentUser.role !== "admin");
    loadSensors();
    loadReadings();
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    authError.textContent = "Неверные логин или пароль";
    return;
  }

  const data = await res.json();
  setSession(data.token, data.user);
});

document.getElementById("logout-btn").addEventListener("click", clearSession);

document.getElementById("refresh-sensors").addEventListener("click", loadSensors);
document.getElementById("load-readings").addEventListener("click", loadReadings);
document.getElementById("load-users").addEventListener("click", loadUsers);

async function loadSensors() {
  const res = await api("/api/sensors");
  if (!res.ok) return;
  const sensors = await res.json();
  const list = document.getElementById("sensors-list");
  list.innerHTML = sensors
    .map((s) => `<li>#${s.id} ${s.name} | ${s.location} | ${s.status}</li>`)
    .join("");
}

async function loadReadings() {
  const sensorId = document.getElementById("sensor-filter").value;
  const q = sensorId ? `?sensor_id=${sensorId}&limit=30` : "?limit=30";
  const res = await api(`/api/readings${q}`);
  if (!res.ok) return;
  const readings = await res.json();
  const list = document.getElementById("readings-list");
  list.innerHTML = readings
    .slice(0, 10)
    .map((r) => `<li>#${r.id}: sensor=${r.sensor_id}, value=${r.value}${r.unit}, ${new Date(r.recorded_at).toLocaleString()}</li>`)
    .join("");

  const labels = [...readings].reverse().map((r) => new Date(r.recorded_at).toLocaleTimeString());
  const values = [...readings].reverse().map((r) => r.value);
  renderChart(labels, values);
}

function renderChart(labels, values) {
  const ctx = document.getElementById("readings-chart");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Показания",
        data: values,
        borderColor: "#2563eb",
        fill: false,
        tension: 0.25,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

async function loadUsers() {
  if (!currentUser || currentUser.role !== "admin") return;
  const res = await api("/api/users");
  if (!res.ok) return;
  const users = await res.json();
  document.getElementById("users-list").innerHTML = users
    .map((u) => `<li>#${u.id} ${u.username} (${u.role})</li>`)
    .join("");
}

renderAuthState();

