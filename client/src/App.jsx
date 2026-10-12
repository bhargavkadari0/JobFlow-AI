import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddJob from "./pages/AddJob";
import Applications from "./pages/Applications";
import ApplicationDetails from "./pages/ApplicationDetails";
import InterviewPrep from "./pages/InterviewPrep";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/add-job"
          element={<AddJob />}
        />

        <Route
          path="/applications"
          element={<Applications />}
        />

        <Route
          path="/applications/:id"
          element={<ApplicationDetails />}
        />

        <Route
          path="/interview-prep"
          element={<InterviewPrep />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;