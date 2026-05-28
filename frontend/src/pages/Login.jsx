import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // For Module 1 login just goes to the dashboard.
  // Real password login is added in a later module.
  function handleLogin(e) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="flex h-screen items-center justify-center
                    bg-gray-100">
      <form onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-80">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Meli Sync Login</h1>
        <label className="block text-sm mb-1">Username</label>
        <input value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="admin" />
        <label className="block text-sm mb-1">Password</label>
        <input type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-6"
          placeholder="********" />
        <button type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded
                     hover:bg-blue-700">Log In</button>
      </form>
    </div>
  );
}

export default Login;