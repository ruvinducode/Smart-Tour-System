import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AuthForm from "./components/AuthForm";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white shadow-sm">
          <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Smart Tour Frontend</h1>
            <div className="space-x-3 text-sm font-medium">
              <Link className="text-blue-600 hover:underline" to="/user/login">User Login</Link>
              <Link className="text-blue-600 hover:underline" to="/user/register">User Register</Link>
              <Link className="text-blue-600 hover:underline" to="/driver/login">Driver Login</Link>
              <Link className="text-blue-600 hover:underline" to="/driver/register">Driver Register</Link>
            </div>
          </nav>
        </header>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/user/login" element={<AuthForm mode="login" role="user" />} />
            <Route path="/user/register" element={<AuthForm mode="register" role="user" />} />
            <Route path="/driver/login" element={<AuthForm mode="login" role="driver" />} />
            <Route path="/driver/register" element={<AuthForm mode="register" role="driver" />} />
            <Route
              path="/"
              element={
                <div className="mt-12 p-8 bg-white rounded-xl shadow text-center">
                  <h2 className="text-2xl font-bold mb-3">Welcome</h2>
                  <p className="text-slate-600 mb-4">Use the navigation links to login or register as user/driver.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

