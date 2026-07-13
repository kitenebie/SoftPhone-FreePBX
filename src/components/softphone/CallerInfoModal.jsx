import Draggable from "react-draggable";
import { GripHorizontal, X } from "lucide-react";

/**
 * CallerInfoModal — draggable caller registration form.
 *
 * Props:
 *   nodeRef              React ref
 *   defaultPosition      { x, y }
 *   callerInfoForm       { completeName, completeAddress, age, gender }
 *   setCallerInfoForm    fn
 *   callerInfoMobileNumber  string
 *   callerInfoErrors     { completeName?, completeAddress?, submit? }
 *   submittingCallerInfo boolean
 *   onSubmit             (e) => void
 *   onClose              () => void
 */
export default function CallerInfoModal({
  nodeRef,
  defaultPosition,
  callerInfoForm,
  setCallerInfoForm,
  callerInfoMobileNumber,
  callerInfoErrors,
  submittingCallerInfo,
  onSubmit,
  onClose,
}) {
  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".sp-panel-header"
      bounds="parent"
      defaultPosition={defaultPosition}
    >
      <div ref={nodeRef} className="sp-caller-info-panel">
        <div className="sp-panel-inner">
          <div className="sp-panel-header">
            <GripHorizontal size={14} style={{ cursor: "move" }} />
            <span>Caller Registration</span>
            <button
              type="button"
              className="sp-icon-btn sp-caller-info-close-btn"
              onClick={onClose}
              title="Close"
              style={{ marginLeft: "auto" }}
            >
              <X size={14} />
            </button>
          </div>
          <form onSubmit={onSubmit} className="sp-caller-info-body">
            <div className="sp-caller-info-title">New Caller Info</div>
            <div className="sp-caller-info-subtitle">
              No matching records found. Please register the caller's details.
            </div>

            <div className="sp-caller-info-grid">
              {/* Complete Name */}
              <div className="sp-form-group">
                <label className="sp-form-label required">Complete Name</label>
                <input
                  type="text"
                  className="sp-form-input"
                  placeholder="John Doe"
                  value={callerInfoForm.completeName}
                  onChange={(e) => setCallerInfoForm((f) => ({ ...f, completeName: e.target.value }))}
                />
                {callerInfoErrors.completeName && (
                  <span className="sp-form-error">{callerInfoErrors.completeName}</span>
                )}
              </div>

              {/* Age */}
              <div className="sp-form-group">
                <label className="sp-form-label">Age</label>
                <input
                  type="number"
                  className="sp-form-input"
                  placeholder="Enter age"
                  min="0"
                  max="120"
                  value={callerInfoForm.age}
                  onChange={(e) => setCallerInfoForm((f) => ({ ...f, age: e.target.value }))}
                />
              </div>

              {/* Complete Address */}
              <div className="sp-form-group" style={{ gridColumn: "span 2" }}>
                <label className="sp-form-label required">Complete Address</label>
                <input
                  type="text"
                  className="sp-form-input"
                  placeholder="123 Main St, City"
                  value={callerInfoForm.completeAddress}
                  onChange={(e) => setCallerInfoForm((f) => ({ ...f, completeAddress: e.target.value }))}
                />
                {callerInfoErrors.completeAddress && (
                  <span className="sp-form-error">{callerInfoErrors.completeAddress}</span>
                )}
              </div>

              {/* Mobile Number (read-only) */}
              <div className="sp-form-group">
                <label className="sp-form-label">Mobile Number</label>
                <input
                  type="text"
                  className="sp-form-input"
                  value={callerInfoMobileNumber}
                  disabled
                  readOnly
                />
              </div>

              {/* Gender */}
              <div className="sp-form-group">
                <label className="sp-form-label">Gender</label>
                <div className="sp-gender-options">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="sp-gender-option">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={callerInfoForm.gender === g}
                        onChange={() => setCallerInfoForm((f) => ({ ...f, gender: g }))}
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {callerInfoErrors.submit && (
              <span className="sp-form-error" style={{ textAlign: "center" }}>
                {callerInfoErrors.submit}
              </span>
            )}

            <button
              type="submit"
              className="sp-caller-info-submit-btn"
              disabled={submittingCallerInfo}
            >
              {submittingCallerInfo ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid #fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spSpin 0.6s linear infinite",
                    }}
                  />
                  Submitting...
                </>
              ) : (
                "Register Caller"
              )}
            </button>
          </form>
        </div>
      </div>
    </Draggable>
  );
}
