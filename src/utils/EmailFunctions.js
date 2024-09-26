export function generateWelcomeEmail (user, password) {
  return {
    to: user.gmail,
    subject: '¡Bienvenido a LegalEye!',
    text: `Hola ${user.name}, tu cuenta fue creada exitosamente. Tu contraseña es ${password}`
  }
}
