function testUser(user) {
  /**
   * As Discord will be slowly retiring user discriminators, need to test a user has a discriminator before
   * using it.
   *
   * Be aware, during the migration, a discriminator of 0 (user#0) means the user has migrated their username
  **/
  if (user.hasOwnProperty('discriminator')) {
    if (user.discriminator != 0) {
      return user.username + "#" + user.discriminator;
    } else {
      console.log("This discriminator has migrated! " + user.username + "#" + user.discriminator);
      return user.username;
    }
  } else {
    return user.username; // need to watch in case Discord alters the user object
  }
}

module.exports = {testUser};
