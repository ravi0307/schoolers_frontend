export function isValidPhone(value) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidAadhaar(value) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 12;
}
