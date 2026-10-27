import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import "../styles/Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios({
        method: "post",
        url: `${API_URL}/login`,
        data: {
          username: username.trim(),
          password: password.trim(),
          role
        },
        headers: {
          "Content-Type": "application/json"
        }
      });

      const { data } = response;

      if (data.success) {
        if (role === "admin") {
          localStorage.setItem("adminEmail", data.adminInfo.email);
          localStorage.setItem("isAdmin", "true");
          navigate("/home");
        } else {
          localStorage.setItem("vehicleId", data.driverInfo.vehicleId);
          localStorage.setItem("staffcode", data.driverInfo.staffcode);
          localStorage.setItem("isDriver", "true");
          navigate("/driver-dashboard");
        }
      }
    } catch (error) {
      console.error("Login Error:", error);
      setError(error.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="login-container">
      <div className="login-shell">
        <header className="login-header">
          <img src="/Images/Logo.png" alt="National Engineering College Logo" className="logo left-logo" />
          <div className="header-content">
            <p className="header-kicker">National Engineering College</p>
            <p>
              Autonomous institution affiliated to Anna University, Chennai
              <br />
              K.R. Nagar, Kovilpatti - 628503, Thoothukudi District, Tamil Nadu
              <br />
              Phone: 04632 - 222502, 230227 | Email:{" "}
              <a href="mailto:principal@nec.edu.in" className="header-link">
                principal@nec.edu.in
              </a>{" "}
              | Web:{" "}
              <a
                href="https://www.nec.edu.in"
                target="_blank"
                rel="noopener noreferrer"
                className="header-link"
              >
                www.nec.edu.in
              </a>
            </p>
          </div>
          <img src="/Images/Founder.jpg" alt="Founder" className="logo right-logo" />
        </header>

        <main className="login-main">
          <section className="login-card">
            <div className="login-card-header">
              <p className="panel-kicker">Secure Sign-In</p>
              <h2>Portal Login</h2>
              <p>Select your access type and continue to the workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="role-selection">
                <label className={role === "admin" ? "role-pill active" : "role-pill"}>
                  <input
                    type="radio"
                    value="admin"
                    checked={role === "admin"}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Administrator</span>
                </label>

                <label className={role === "driver" ? "role-pill active" : "role-pill"}>
                  <input
                    type="radio"
                    value="driver"
                    checked={role === "driver"}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Driver</span>
                </label>
              </div>

              <div className="form-group">
                <label>{role === "driver" ? "Bus Number" : "User Name"}</label>
                <input
                  type="text"
                  placeholder={role === "driver" ? "Enter bus number" : "Enter user name"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="stay-signed-in">
                <input type="checkbox" id="staySignedIn" />
                <label htmlFor="staySignedIn">Stay signed in on this device</label>
              </div>

              <button type="submit" className="login-button">
                Sign In
              </button>

              {error && <div className="error-message">{error}</div>}

              <div className="forgot-password">
                <button type="button" className="forgot-password-button">
                  Forgot password or username?
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Login;
