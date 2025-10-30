import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFadeOut(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      setTimeout(() => navigate("/home"), 1500);
    } catch (err) {
      setError("Invalid email or password");
      setTimeout(() => setFadeOut(true), 2000); // fade after 2s
      setTimeout(() => setError(""), 3000); // remove after fade
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        html, body {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        .login-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #90caf9, #e1bee7);
          font-family: "Poppins", sans-serif;
        }
        .login-box {
          background: #fff;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 380px;
          text-align: center;
        }
        .login-title {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .input-box {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #ccc;
          padding: 0.4rem;
        }
        .input-box svg {
          margin-right: 8px;
          color: #555;
        }
        .input-box input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 14px;
          padding: 0.5rem;
        }
        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #555;
        }
        .error-text {
          color: #d32f2f;
          font-size: 12px;
          margin: -0.5rem 0 0.8rem 0;
          text-align: left;
        }
        .options {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #444;
          margin-bottom: 1rem;
        }
        .options a {
          text-decoration: none;
          color: #333;
        }
        .login-btn {
          width: 100%;
          background: #2e7d32;
          color: #fff;
          padding: 0.8rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.3s;
        }
        .login-btn:hover {
          background: #1b5e20;
        }
        .login-btn:disabled {
          background: #aaa;
          cursor: not-allowed;
        }
        .error-msg {
          color: #d32f2f;
          font-size: 13px;
          margin-bottom: 1rem;
          opacity: 1;
          transition: opacity 1s ease;
        }
        .error-msg.fade-out {
          opacity: 0;
        }
        .footer {
          margin-top: 1.5rem;
          font-size: 13px;
          color: #555;
        }
        .footer span {
          color: red;
        }
      `}</style>

      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">Login Form</h1>

          {error && (
            <p className={`error-msg ${fadeOut ? "fade-out" : ""}`}>{error}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {formErrors.email && (
              <p className="error-text">{formErrors.email}</p>
            )}

            <div className="input-box">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="error-text">{formErrors.password}</p>
            )}

            <div className="options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="/forgot-password">Forgot password</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login Now"}
            </button>
          </form>

          <p className="footer">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
