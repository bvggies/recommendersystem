export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') {
      return data.error;
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
    if (data.error && typeof data.error.message === 'string') {
      return data.error.message;
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
