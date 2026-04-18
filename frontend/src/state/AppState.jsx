import { createContext, useContext, useMemo, useState } from "react";

const AppContext = createContext(null);

const initialNotifications = [
  "Security warning resolved in last audit",
  "Roadmap updated with two new milestones",
  "Resume optimization score improved by 8%",
];

export function AppProvider({ children }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [toast, setToast] = useState("");
  const [auditInput, setAuditInput] = useState({ githubUrl: "", liveUrl: "" });

  const value = useMemo(
    () => ({
      notifications,
      toast,
      auditInput,
      setAuditInput,
      dismissNotification: () => setNotifications((prev) => prev.slice(1)),
      pushToast: (message) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 1800);
      },
    }),
    [notifications, toast, auditInput],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return ctx;
}
