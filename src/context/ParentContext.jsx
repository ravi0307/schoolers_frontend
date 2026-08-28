import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import * as peopleApi from "../api/people";

const ParentContext = createContext(null);

export function ParentProvider({ children }) {
  const { user } = useAuth();
  const [kids, setKids] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.linkedPersonId) {
      setLoading(false);
      return;
    }
    peopleApi
      .childrenOfParent(user.linkedPersonId)
      .then((data) => {
        setKids(data);
        if (data.length) setSelectedChildId(data[0].student_id);
      })
      .finally(() => setLoading(false));
  }, [user?.linkedPersonId]);

  const selectedChild = kids.find((k) => k.student_id === selectedChildId) || null;

  return (
    <ParentContext.Provider value={{ kids, selectedChild, selectedChildId, setSelectedChildId, loading }}>
      {children}
    </ParentContext.Provider>
  );
}

export function useParentContext() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error("useParentContext must be used within ParentProvider");
  return ctx;
}
