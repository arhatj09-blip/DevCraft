function AuthInput({
  id,
  label,
  icon,
  type = "text",
  value,
  error,
  touched,
  onChange,
  onBlur,
  autoComplete,
  required,
  showToggle,
  onToggle,
  isVisible,
}) {
  const hasValue = Boolean(value);
  const showError = touched && Boolean(error);
  const showSuccess = touched && !error && hasValue;

  return (
    <div className="auth-field">
      <div
        className={`auth-input-wrap ${showError ? "is-invalid" : ""} ${showSuccess ? "is-valid" : ""}`}
      >
        <span
          className="material-symbols-outlined auth-leading-icon"
          aria-hidden
        >
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="auth-input"
          autoComplete={autoComplete}
          required={required}
          placeholder=" "
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
        />
        <label htmlFor={id} className="auth-floating-label">
          {label}
        </label>

        {showToggle ? (
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={onToggle}
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined">
              {isVisible ? "visibility_off" : "visibility"}
            </span>
          </button>
        ) : null}
      </div>

      <p
        id={`${id}-error`}
        className={`auth-inline-msg ${showError ? "is-visible" : ""}`}
        role={showError ? "alert" : undefined}
      >
        {showError ? error : ""}
      </p>
    </div>
  );
}

export default AuthInput;
