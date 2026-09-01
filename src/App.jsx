import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ParentProvider } from "./context/ParentContext";
import { TeacherProvider } from "./context/TeacherContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import Login from "./pages/Login";

import ParentHome from "./pages/parent/ParentHome";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentMarks from "./pages/parent/ParentMarks";
import ParentLeave from "./pages/parent/ParentLeave";
import ParentBarter from "./pages/parent/ParentBarter";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherMarks from "./pages/teacher/TeacherMarks";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminLeave from "./pages/admin/AdminLeave";
import AdminWebsite from "./pages/admin/AdminWebsite";
import AdminNotifications from "./pages/admin/AdminNotifications";

import PilotPickDrop from "./pages/pilot/PilotPickDrop";
import PilotLeave from "./pages/pilot/PilotLeave";

import MasterSchools from "./pages/master/MasterSchools";
import MasterSchoolDetail from "./pages/master/MasterSchoolDetail";
import MasterSystemHealth from "./pages/master/MasterSystemHealth";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const home = {
    parent: "/parent/home",
    teacher: "/teacher/dashboard",
    admin: "/admin/dashboard",
    pilot: "/pilot/pickdrop",
    master: "/master/schools",
  }[user.role];
  return <Navigate to={home || "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Parent */}
            <Route
              path="/parent/*"
              element={
                <ProtectedRoute roles={["parent"]}>
                  <ParentProvider>
                    <Routes>
                      <Route path="home" element={<ParentHome />} />
                      <Route path="attendance" element={<ParentAttendance />} />
                      <Route path="marks" element={<ParentMarks />} />
                      <Route path="leave" element={<ParentLeave />} />
                      <Route path="barter" element={<ParentBarter />} />
                      <Route path="*" element={<Navigate to="/parent/home" replace />} />
                    </Routes>
                  </ParentProvider>
                </ProtectedRoute>
              }
            />

            {/* Teacher */}
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute roles={["teacher"]}>
                  <TeacherProvider>
                    <Routes>
                      <Route path="dashboard" element={<TeacherDashboard />} />
                      <Route path="attendance" element={<TeacherAttendance />} />
                      <Route path="marks" element={<TeacherMarks />} />
                      <Route path="timetable" element={<TeacherTimetable />} />
                      <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
                    </Routes>
                  </TeacherProvider>
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="classes" element={<AdminClasses />} />
                    <Route path="students" element={<AdminStudents />} />
                    <Route path="teachers" element={<AdminTeachers />} />
                    <Route path="staff" element={<AdminStaff />} />
                    <Route path="routes" element={<AdminRoutes />} />
                    <Route path="leave" element={<AdminLeave />} />
                    <Route path="website" element={<AdminWebsite />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Pilot */}
            <Route
              path="/pilot/*"
              element={
                <ProtectedRoute roles={["pilot"]}>
                  <Routes>
                    <Route path="pickdrop" element={<PilotPickDrop />} />
                    <Route path="leave" element={<PilotLeave />} />
                    <Route path="*" element={<Navigate to="/pilot/pickdrop" replace />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Master Admin */}
            <Route
              path="/master/*"
              element={
                <ProtectedRoute roles={["master"]}>
                  <Routes>
                    <Route path="schools" element={<MasterSchools />} />
                    <Route path="schools/:schoolId" element={<MasterSchoolDetail />} />
                    <Route path="system-health" element={<MasterSystemHealth />} />
                    <Route path="*" element={<Navigate to="/master/schools" replace />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
