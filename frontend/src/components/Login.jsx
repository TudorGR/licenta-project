import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setFormError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className=" bg-white border border-gray-200 rounded-3xl shadow-xl w-full max-w-sm">
        <header className="border-b-1 border-gray-200 h-14 flex justify-between items-center">
          <h1 className="ml-4 text-lg">Log in</h1>
        </header>

        {(formError || error) && (
          <div className=" bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {formError || error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <input
            className="border-b-1 border-gray-200  px-4 h-12 outline-0 w-full appearance-none  text-gray-700 leading-tight focus:outline-none "
            id="email"
            type="email"
            name="email"
            placeholder="Email Address"
            value={email}
            onChange={onChange}
            required
          />
          <input
            className=" appearance-none px-4 h-12 outline-0 border-b-1 border-gray-200  w-full py-2  text-gray-700 leading-tight focus:outline-none "
            id="password"
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={onChange}
            required
          />
          <div className="flex justify-end items-center h-14">
            <Link
              to="/register"
              className="transition-all flex items-center active:bg-gray-50 cursor-pointer border px-4 h-10 shadow-custom border-gray-200 rounded-full mr-2"
            >
              <p>Sign Up</p>
            </Link>
            <button
              type="submit"
              className="transition-all  flex items-center justify-center active:bg-gray-700 shadow-custom text-white bg-black cursor-pointer px-4 h-10  rounded-full mr-2"
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
