export function generateWelcomeEmail (user, password) {
  return {
    to: user.gmail,
    subject: '¡Bienvenido a LegalEye!',
    text: `Hola ${user.name}, tu cuenta fue creada exitosamente. Tu contraseña es ${password}`
  }
}
export function generatePasswordResetEmail (gmail, verificationCode) {
  return {
    to: gmail,
    subject: 'Código de verificación',
    text: `Tu código de verificación es ${verificationCode}. Este código es válido por 1 minuto.`
  }
}

export function generatePasswordResetEmailSend (gmail, newPassword) {
  return {
    to: gmail,
    subject: 'Tu nueva contraseña:',
    text: `Tu nueva contraseña: ${newPassword}. Por favor utilice esto para iniciar sesión.`
  }
}
