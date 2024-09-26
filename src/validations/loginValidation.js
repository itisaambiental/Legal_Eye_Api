import { z } from 'zod'

const loginSchema = z.object({
  gmail: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(12, { message: 'Password must be at least 12 characters' })
})

export default loginSchema
