import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import * as peopleApi from "../api/people";

const TeacherContext = createContext(null);

export function TeacherProvider({ children }) {
  const { user } = useAuth();
  const [load, setLoad] = useState([]); // [{class_id, subject_id, teacher_id, is_class_teacher}]
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.linkedPersonId) {
      setLoading(false);
      return;
    }
    peopleApi
      .teachingLoad(user.linkedPersonId)
      .then((data) => {
        setLoad(data);
        if (data.length) setSelectedClassId(data[0].class_id);
      })
      .finally(() => setLoading(false));
  }, [user?.linkedPersonId]);

  const classIds = [...new Set(load.map((l) => l.class_id))];
  const subjectsForSelectedClass = load
    .filter((l) => l.class_id === selectedClassId)
    .map((l) => l.subject_id);

  return (
    <TeacherContext.Provider
      value={{ load, classIds, selectedClassId, setSelectedClassId, subjectsForSelectedClass, loading }}
    >
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacherContext() {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacherContext must be used within TeacherProvider");
  return ctx;
}
