function withUser(userId, query = {}) {
  return { userId, ...query };
}

module.exports = { withUser };
