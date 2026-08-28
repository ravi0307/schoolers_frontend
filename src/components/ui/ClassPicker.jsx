export default function ClassPicker({ classIds, selectedClassId, onSelect, label = "Class" }) {
  if (!classIds || classIds.length < 2) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-label" style={{ margin: "0 0 8px" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {classIds.map((id) => (
          <button
            key={id}
            className="btn sm"
            style={{
              background: id === selectedClassId ? "var(--chalk-green)" : "var(--paper-light)",
              color: id === selectedClassId ? "#fff" : "var(--ink)",
              border: "1.5px solid var(--line)",
            }}
            onClick={() => onSelect(id)}
          >
            Class #{id}
          </button>
        ))}
      </div>
    </div>
  );
}
