import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const { register, error } = useContext(AuthContext);
  const navigate = useNavigate();

  const { name, email, password, confirmPassword } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    try {
      await register({ name, email, password });
      navigate("/");
    } catch (err) {
      setFormError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className=" bg-white rounded-3xl shadow-xl border border-gray-200 w-full max-w-sm">
        <header className="border-b-1 border-gray-200 h-14 flex justify-between items-center">
          <h1 className="ml-4 text-lg">Sign Up</h1>
        </header>

        {(formError || error) && (
          <div className=" bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {formError || error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <input
            className="border-b-1 border-gray-200  px-4 h-12 outline-0 w-full appearance-none  text-gray-700 leading-tight focus:outline-none  "
            id="name"
            type="text"
            name="name"
            placeholder="Name"
            value={name}
            onChange={onChange}
            required
          />
          <input
            className="border-b-1 border-gray-200  px-4 h-12 outline-0 w-full appearance-none  text-gray-700 leading-tight focus:outline-none"
            id="email"
            type="email"
            name="email"
            placeholder="Email Address"
            value={email}
            onChange={onChange}
            required
          />
          <input
            className="border-b-1 border-gray-200  px-4 h-12 outline-0 w-full appearance-none  text-gray-700 leading-tight focus:outline-none"
            id="password"
            type="password"
            name="password"
            value={password}
            placeholder="Password"
            onChange={onChange}
            required
            minLength="6"
          />
          <input
            className="border-b-1 border-gray-200  px-4 h-12 outline-0 w-full appearance-none  text-gray-700 leading-tight focus:outline-none"
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            placeholder="Confirm Password"
            onChange={onChange}
            required
            minLength="6"
          />
          <div className="flex justify-end items-center h-14">
            <Link
              to="/login"
              className="transition-all flex items-center active:bg-gray-50 cursor-pointer border px-4 h-10 shadow-custom border-gray-200 rounded-full mr-2"
            >
              <p>Log in</p>
            </Link>
            <button
              type="submit"
              className="transition-all  flex items-center justify-center active:bg-gray-700 shadow-custom text-white bg-black cursor-pointer px-4 h-10  rounded-full mr-2"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
