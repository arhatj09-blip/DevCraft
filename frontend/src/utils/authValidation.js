const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function getPasswordStrength(password) {
  const value = password ?? "";
  const checks = {
    minLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const percent = Math.max(10, Math.round((score / 5) * 100));

  let label = "Weak";
  if (score >= 4) label = "Strong";
  else if (score >= 3) label = "Medium";

  return {
    checks,
    score,
    percent,
    label,
    colorToken:
      label === "Strong" ? "strong" : label === "Medium" ? "medium" : "weak",
  };
}

export function validateAuthForm(form, mode) {
  const errors = {};

  if (mode === "signup") {
    if (!form.name?.trim()) {
      errors.name = "Full name is required";
    } else if (form.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
  }

  if (!form.email?.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  const strength = getPasswordStrength(form.password);
  if (!form.password) {
    errors.password = "Password is required";
  } else if (mode === "signup" && strength.score < 4) {
    errors.password = "Use a stronger password to continue";
  } else if (mode === "login" && form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (mode === "signup" && !form.termsAccepted) {
    errors.termsAccepted = "You must accept the Terms and Privacy Policy";
  }

  return {
    errors,
    strength,
    isValid: Object.keys(errors).length === 0,
  };
}
