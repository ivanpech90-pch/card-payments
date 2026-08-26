const PIN_KEY = "app_pin_enabled";
const PIN_VALUE_KEY = "app_pin_value";

export function isPinEnabled() {
  return localStorage.getItem(PIN_KEY) === "true";
}

export function getPin() {
  return localStorage.getItem(PIN_VALUE_KEY);
}

export function savePin(pin: string) {
  localStorage.setItem(PIN_KEY, "true");
  localStorage.setItem(PIN_VALUE_KEY, pin);
}

export function disablePin() {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(PIN_VALUE_KEY);
}
export function isUnlocked() {
    return sessionStorage.getItem("app_unlocked") === "true";
  }
  
  export function unlockApp() {
    sessionStorage.setItem("app_unlocked", "true");
  }
  
  export function lockApp() {
    sessionStorage.removeItem("app_unlocked");
  }