import { z } from 'zod'

// Validation schema for a user's data
const userSchema = z.object({
  name: z.string().min(3, 'The name is required and must have at least 3 characters'),
  gmail: z.string()
    .email('The email must be valid')
    .refine((email) => email.endsWith('@isaambiental.com'), {
      message: 'The email must end with @isaambiental.com'
    }),
  roleId: z.string()
    .transform(value => parseInt(value, 10))
    .refine(value => !isNaN(value), { message: 'The roleId must be a valid number' })
    .refine(value => value === 1 || value === 2, {
      message: 'The roleId must be either 1 (Admin) or 2 (Analyst)'
    })
})

export default userSchema
