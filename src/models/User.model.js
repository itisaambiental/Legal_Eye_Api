// models/User.model.js

// User model
class User {
  constructor (id, name, password, gmail, roleId, profilePicture) {
    this.id = id
    this.name = name
    this.password = password
    this.gmail = gmail
    this.roleId = roleId
    this.profile_picture = profilePicture
  }
}

export default User
