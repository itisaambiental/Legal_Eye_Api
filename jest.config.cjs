module.exports = {
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'node']
}
