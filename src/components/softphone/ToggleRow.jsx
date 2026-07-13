// ToggleRow — simple labeled toggle switch row
export default function ToggleRow({ label, k, uiPrefs, onToggle }) {
  return (
    <div className="sp-pref-row">
      <span>{label}</span>
      <button
        className={`sp-pref-toggle ${uiPrefs[k] ? "on" : ""}`}
        onClick={() => onToggle(k, !uiPrefs[k])}
        type="button"
      >
        <span className="sp-pref-thumb" />
      </button>
    </div>
  );
}
