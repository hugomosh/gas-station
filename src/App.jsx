import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import GasStationForm from "./DataCollection";
import Dashboard from "./Dashboard";

function Nav() {
  const location = useLocation();

  // Don't show nav on the main form page
  if (
    location.pathname === "/gas-station" ||
    location.pathname === "/gas-station/" ||
    location.pathname === "/"
  ) {
    return null;
  }

  return (
    <nav className="bg-white shadow mb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-4 items-center">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-gray-100">
              Data Collection
            </Link>
            <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-gray-100">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter basename="/gas-station">
      <Nav />
      <Routes>
        <Route path="" element={<GasStationForm />} />
        <Route path="/" element={<GasStationForm />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
