import { useState } from "react";

const AuthForm = ({ mode, role, onSuccess }) => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    country: "",
    license_number: "",
    vehicle_number: "",
    vehicle_type: "",
    capacity: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const apiPath = role === "driver"
    ? mode === "login" ? "/driver/login" : "/driver/register"
    : mode === "login" ? "/login" : "/register";

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const submitBody = {
    full_name: form.full_name,
    email: form.email,
    password: form.password,
    phone: form.phone,
    country: form.country,
  };

  if (role === "driver") {
    submitBody.license_number = form.license_number;
    submitBody.vehicle_number = form.vehicle_number;
    submitBody.vehicle_type = form.vehicle_type;
    submitBody.capacity = form.capacity;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}${apiPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong");
      } else {
        setMessage(data.message || "Success");
        onSuccess && onSuccess(data);
      }
    } catch (err) {
      setMessage("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-800 capitalize">
        {role} {mode}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {(mode === "register") && (
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full border rounded px-3 py-2"
            required
          />
        )}

        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          required
        />

        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          required
        />

        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone"
          className="w-full border rounded px-3 py-2"
        />

        {mode === "register" && (
          <input
            name="country"
            value={form.country}
            onChange={handleChange}
            placeholder="Country"
            className="w-full border rounded px-3 py-2"
          />
        )}

        {role === "driver" && mode === "register" && (
          <>
            <input
              name="license_number"
              value={form.license_number}
              onChange={handleChange}
              placeholder="License Number"
              className="w-full border rounded px-3 py-2"
            />
            <input
              name="vehicle_number"
              value={form.vehicle_number}
              onChange={handleChange}
              placeholder="Vehicle Number"
              className="w-full border rounded px-3 py-2"
            />
            <input
              name="vehicle_type"
              value={form.vehicle_type}
              onChange={handleChange}
              placeholder="Vehicle Type"
              className="w-full border rounded px-3 py-2"
            />
            <input
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              placeholder="Capacity"
              type="number"
              className="w-full border rounded px-3 py-2"
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          {loading ? "Please wait..." : `${mode === "login" ? "Login" : "Register"}`}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-sm text-slate-600">{message}</p>
      )}
    </div>
  );
};

export default AuthForm;
