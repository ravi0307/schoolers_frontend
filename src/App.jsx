import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ParentProvider } from "./context/ParentContext";
import { TeacherProvider } from "./context/TeacherContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminShell from "./components/layout/AdminShell";
import ParentShell from "./components/layout/ParentShell";
import TeacherShell from "./components/layout/TeacherShell";
import StaffShell from "./components/layout/StaffShell";

import Login from "./pages/Login";
import PublicWebsite from "./pages/PublicWebsite";
import UserProfile from "./pages/UserProfile";

import ParentHome from "./pages/parent/ParentHome";
import ParentPickDrop from "./pages/parent/ParentPickDrop";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentMarks from "./pages/parent/ParentMarks";
import ParentLeave from "./pages/parent/ParentLeave";
import ParentBarter from "./pages/parent/ParentBarter";
import ParentGallery from "./pages/parent/ParentGallery";
import ParentTimetable from "./pages/parent/ParentTimetable";
import ParentReport from "./pages/parent/ParentReport";
import ParentTripHistory from "./pages/parent/ParentTripHistory";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherMarks from "./pages/teacher/TeacherMarks";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TeacherBroadcast from "./pages/teacher/TeacherBroadcast";
import TeacherGallery from "./pages/teacher/TeacherGallery";
import TeacherReport from "./pages/teacher/TeacherReport";

import StaffBroadcast from "./pages/staff/StaffBroadcast";
import StaffGallery from "./pages/staff/StaffGallery";
import StaffReport from "./pages/staff/StaffReport";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminHolidays from "./pages/admin/AdminHolidays";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminLeave from "./pages/admin/AdminLeave";
import AdminWebsite from "./pages/admin/AdminWebsite";
import AdminWebsiteBuilder from "./pages/admin/AdminWebsiteBuilder";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAccounts from "./pages/admin/AdminAccounts";
import AdminReports from "./pages/admin/AdminReports";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminTripHistory from "./pages/admin/AdminTripHistory";

import PilotPickDrop from "./pages/pilot/PilotPickDrop";
import PilotBroadcast from "./pages/pilot/PilotBroadcast";
import PilotLeave from "./pages/pilot/PilotLeave";
import PilotReport from "./pages/pilot/PilotReport";
import PilotTrips from "./pages/pilot/PilotTrips";

import MasterSchools from "./pages/master/MasterSchools";
import MasterSchoolDetail from "./pages/master/MasterSchoolDetail";
import MasterSystemHealth from "./pages/master/MasterSystemHealth";
import MasterSupport from "./pages/master/MasterSupport";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const home = {
    parent: "/parent/home",
    teacher: "/teacher/dashboard",
    admin: "/admin/dashboard",
    pilot: "/pilot/pickdrop",
    master: "/master/schools",
    staff: "/staff/broadcast",
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
            <Route path="/site/:schoolId" element={<PublicWebsite />} />
            <Route path="/website/:schoolName" element={<PublicWebsite />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Parent */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute roles={["parent"]}>
                  <ParentProvider>
                    <ParentShell />
                  </ParentProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<ParentHome />} />
              <Route path="pickdrop" element={<ParentPickDrop />} />
              <Route path="trips" element={<ParentTripHistory />} />
              <Route path="attendance" element={<ParentAttendance />} />
              <Route path="timetable" element={<ParentTimetable />} />
              <Route path="marks" element={<ParentMarks />} />
              <Route path="report" element={<ParentReport />} />
              <Route path="leave" element={<ParentLeave />} />
              <Route path="barter" element={<ParentBarter />} />
              <Route path="gallery" element={<ParentGallery />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/parent/home" replace />} />
            </Route>

            {/* Teacher */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute roles={["teacher"]}>
                  <TeacherProvider>
                    <TeacherShell />
                  </TeacherProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="marks" element={<TeacherMarks />} />
              <Route path="timetable" element={<TeacherTimetable />} />
              <Route path="broadcast" element={<TeacherBroadcast />} />
              <Route path="gallery" element={<TeacherGallery />} />
              <Route path="report" element={<TeacherReport />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
            </Route>

            {/* Staff */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={["staff"]}>
                  <StaffShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="broadcast" replace />} />
              <Route path="broadcast" element={<StaffBroadcast />} />
              <Route path="gallery" element={<StaffGallery />} />
              <Route path="report" element={<StaffReport />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/staff/broadcast" replace />} />
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="timetable" element={<AdminTimetable />} />
              <Route path="holidays" element={<AdminHolidays />} />
              <Route path="subjects" element={<AdminSubjects />} />
              <Route path="gallery" element={<AdminGallery />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="trips" element={<AdminTripHistory />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="website" element={<AdminWebsite />} />
              <Route path="my_website2" element={<AdminWebsiteBuilder />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="accounts" element={<AdminAccounts />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Pilot */}
            <Route
              path="/pilot/*"
              element={
                <ProtectedRoute roles={["pilot"]}>
                  <Routes>
                    <Route path="pickdrop" element={<PilotPickDrop />} />
                    <Route path="broadcast" element={<PilotBroadcast />} />
                    <Route path="leave" element={<PilotLeave />} />
                    <Route path="trips" element={<PilotTrips />} />
                    <Route path="report" element={<PilotReport />} />
                    <Route path="profile" element={<UserProfile />} />
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
                    <Route path="support" element={<MasterSupport />} />
                    <Route path="profile" element={<UserProfile />} />
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
