import { z } from 'zod'

/**
 * Zod validation schema for a single article.
 * Ensures that the input data meets the requirements for inserting a single article.
 * This schema is used for validation on the backend.
 */
const singleArticleSchema = z.object({
  /**
   * The title of the article.
   * Must be a non-empty string.
   */
  title: z.string().min(1, 'Article title must be a non-empty string'),

  /**
   * The content of the article.
   */
  article: z.string().optional(),

  /**
   * The plain content of the article.
   * Must be a string.
   */
  plainArticle: z.string().optional().default(''),

  /**
   * The order of the article.
   * Must be a number greater than 0.
   */
  order: z.preprocess(
    (value) => (typeof value === 'string' ? Number(value) : value),
    z
      .number({ message: 'The order must be a valid number' })
      .positive('The order must be greater than 0')
  )
})

/**
 * Zod validation schema for an array of articles.
 * Ensures that the array contains at least one article and that each article follows the singleArticleSchema.
 */
const articlesSchema = z
  .array(singleArticleSchema)
  .nonempty('At least one article is required')

/**
 * Enum for article validation reasons.
 */
export const VALIDATION_REASONS = Object.freeze({
  IS_CONTINUATION: 'IsContinuation',
  IS_INCOMPLETE: 'IsIncomplete',
  OTHER: 'Other'
})

/**
 * Zod validation schema for article verification.
 */
const articleVerificationSchema = z.object({
  isValid: z.boolean(),
  reason: z.enum([
    VALIDATION_REASONS.IS_CONTINUATION,
    VALIDATION_REASONS.IS_INCOMPLETE,
    VALIDATION_REASONS.OTHER
  ]).nullable()
})

/**
 * Simplified Zod schema for a single article.
 * This schema is designed for OpenAI models compatibility.
 */
const singleArticleModelSchema = z.object({
  /**
   * The title of the article.
   * Must be a string.
   */
  title: z.string(),

  /**
   * The content of the article.
   * Must be a string.
   */
  article: z.string(),

  /**
   * The plain content of the article.
   * Must always be an empty string.
   */
  plainArticle: z.literal(''),

  /**
   * The order of the article.
   * Must be a number.
   */
  order: z.number()
})

/**
 * Zod validation schema for the Index response.
 */
const sectionsResponseSchema = z.object({
  sections: z.array(z.string()),
  isValid: z.boolean()
})

export { singleArticleSchema, articlesSchema, articleVerificationSchema, singleArticleModelSchema, sectionsResponseSchema }
