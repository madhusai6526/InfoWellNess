import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.username) errors.username = "Username is required";
    else if (formData.username.length < 3)
      errors.username = "At least 3 characters";

    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.lastName) errors.lastName = "Last name is required";

    if (!formData.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email";

    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6)
      errors.password = "At least 6 characters";

    if (!formData.confirmPassword)
      errors.confirmPassword = "Confirm password required";
    else if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(formData);
      navigate("/home");
    } catch (err) {
      setError("Failed to create account. Try again.");
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
        .register-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #90caf9, #e1bee7);
          font-family: "Poppins", sans-serif;
          overflow: hidden;
        }
        .register-box {
          background: #fff;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 420px;
          text-align: center;
        }
        .register-title {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 1.2rem;
        }
        .input-box {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #ccc;
          padding: 0.4rem;
        }
        .input-box span {
          margin-right: 8px;
          font-size: 18px;
        }
        .input-box input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 14px;
          padding: 0.5rem;
        }
        .error-text {
          color: #d32f2f;
          font-size: 12px;
          margin: -0.3rem 0 0.8rem 0;
          text-align: left;
        }
        .register-btn {
          width: 100%;
          background: #1976d2;
          color: #fff;
          padding: 0.8rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.3s;
        }
        .register-btn:hover {
          background: #0d47a1;
        }
        .register-btn:disabled {
          background: #aaa;
          cursor: not-allowed;
        }
        .error-msg {
          color: #d32f2f;
          font-size: 13px;
          margin-bottom: 1rem;
        }
        .footer {
          margin-top: 1.2rem;
          font-size: 13px;
          color: #555;
        }
      `}</style>

      <div className="register-container">
        <div className="register-box">
          <h1 className="register-title">Create Account</h1>

          {error && <p className="error-msg">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <span>
                <User size={18} />
              </span>
              <input
                type="text"
                name="username"
                placeholder="Choose username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            {formErrors.username && (
              <p className="error-text">{formErrors.username}</p>
            )}

            <div className="input-box">
              <span>
                <User size={18} />
              </span>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            {formErrors.firstName && (
              <p className="error-text">{formErrors.firstName}</p>
            )}

            <div className="input-box">
              <span>
                <User size={18} />
              </span>
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            {formErrors.lastName && (
              <p className="error-text">{formErrors.lastName}</p>
            )}

            <div className="input-box">
              <span>
                <Mail size={18} />
              </span>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {formErrors.email && (
              <p className="error-text">{formErrors.email}</p>
            )}

            <div className="input-box">
              <span>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create password"
                value={formData.password}
                onChange={handleChange}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>
            {formErrors.password && (
              <p className="error-text">{formErrors.password}</p>
            )}

            <div className="input-box">
              <span>
                <Lock size={18} />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ cursor: "pointer" }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>
            {formErrors.confirmPassword && (
              <p className="error-text">{formErrors.confirmPassword}</p>
            )}

            <button
              type="submit"
              className="register-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Register Now"}
            </button>
          </form>

          <p className="footer">
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#1976d2", fontWeight: 500 }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
