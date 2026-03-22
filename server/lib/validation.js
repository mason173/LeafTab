const validateUsername = (username) => {
  // Alphanumeric + underscore + dot + at, 3-50 chars
  // Updated to support email-like usernames
  const re = /^[a-zA-Z0-9_.@]{3,50}$/;
  return re.test(username);
};

const validatePassword = (password) => {
  // Min 6 chars
  return typeof password === 'string' && password.length >= 6;
};

module.exports = {
  validateUsername,
  validatePassword,
};
