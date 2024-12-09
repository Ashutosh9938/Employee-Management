const createTokenUser = (user) => {
  return { name: user.fullname, userId: user.id, role: user.role };
};

module.exports = createTokenUser;
