import { getPasswordStrength } from "../../utils/authValidation";

function PasswordStrengthMeter({ password, visible }) {
  const strength = getPasswordStrength(password);
  const checks = strength.checks;

  if (!visible) return null;

  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength-head">
        <span>Password strength</span>
        <strong className={`tone-${strength.colorToken}`}>
          {strength.label}
        </strong>
      </div>

      <div className="auth-strength-track" aria-hidden>
        <i
          className={`auth-strength-fill tone-${strength.colorToken}`}
          style={{ width: `${strength.percent}%` }}
        />
      </div>

      <ul className="auth-rules-list">
        <li className={checks.minLength ? "ok" : ""}>At least 8 characters</li>
        <li className={checks.hasUpper ? "ok" : ""}>One uppercase letter</li>
        <li className={checks.hasNumber ? "ok" : ""}>One number</li>
        <li className={checks.hasSpecial ? "ok" : ""}>One special character</li>
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;
