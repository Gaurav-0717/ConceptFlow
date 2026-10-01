const TOKEN_KEY = "conceptflow.auth.token.v1";

const getPersistentStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export const getAuthToken = (storage = getPersistentStorage()) => {
  try {
    return storage?.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const setAuthToken = (token, storage = getPersistentStorage()) => {
  if (!storage) return false;
  try {
    if (token) storage.setItem(TOKEN_KEY, token);
    else storage.removeItem(TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
};

export const clearAuthToken = (storage = getPersistentStorage()) =>
  setAuthToken("", storage);
