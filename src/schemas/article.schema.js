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
   */
  order: z.coerce
    .number({ invalid_type_error: 'The order must be a number' })
    .int('The order must be an integer')
    .positive('The order must be greater than 0')
})

/**
 * Zod validation schema for an array of articles.
 * Ensures that the array contains at least one article and that each article follows the singleArticleSchema.
 */
const articlesSchema = z
  .array(singleArticleSchema)
  .nonempty('At least one article is required')

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
  sections: z.array(
    z.object({
      title: z.string(),
      line: z.number()
    })
  ),
  isValid: z.boolean()
})

export {
  singleArticleSchema,
  articlesSchema,
  singleArticleModelSchema,
  sectionsResponseSchema
}
