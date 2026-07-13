import { FolderPlus } from "lucide-react";

/**
 * DirectoryModal — modal asking user to pick a recording directory.
 *
 * Props:
 *   onSelect   () => Promise<void>   — triggers showDirectoryPicker
 *   onCancel   () => void
 */
export default function DirectoryModal({ onSelect, onCancel }) {
  return (
    <>
      <div className="sp-settings-backdrop" onClick={onCancel} />
      <div className="sp-dir-modal">
        <div className="sp-dir-modal-header">
          <FolderPlus size={20} />
          <span>Recording Directory Required</span>
        </div>
        <div className="sp-dir-modal-body">
          <p>Auto-recording is enabled but no directory is selected.</p>
          <p>Would you like to select a directory for saving call recordings?</p>
          <div className="sp-dir-modal-note">
            <strong>Note:</strong> After selecting a folder, the system will automatically create:
            <code
              style={{
                display: "block",
                marginTop: "6px",
                padding: "4px 8px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}
            >
              [selected-folder]/video/recordings/Ksip/
            </code>
            All recordings will be saved there.
          </div>
        </div>
        <div className="sp-dir-modal-actions">
          <button className="sp-dir-btn sp-dir-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="sp-dir-btn sp-dir-create" onClick={onSelect}>
            <FolderPlus size={16} />
            Select Directory
          </button>
        </div>
      </div>
    </>
  );
}
