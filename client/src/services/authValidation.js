const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoginInput = ({ email = "", password = "" } = {}) => {
  if (!emailPattern.test(email.trim())) return "Enter a valid email address.";
  if (!password) return "Enter your password.";
  if (new TextEncoder().encode(password).length > 72)
    return "Password must be 72 bytes or fewer.";
  return "";
};

export const validateRegistrationInput = ({
  name = "",
  email = "",
  password = "",
  confirmPassword = "",
} = {}) => {
  if (!name.trim()) return "Enter your name.";
  if (!emailPattern.test(email.trim())) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72)
    return "Password must be 72 bytes or fewer.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
};
