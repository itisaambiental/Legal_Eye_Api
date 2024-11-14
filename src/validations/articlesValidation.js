import { z } from 'zod'

/**
 * Zod validation schema for a list of articles associated with a legal basis.
 * Ensures that the input data meets the requirements for inserting articles.
 * @type {z}
 */
const articleSchema = z.object({
  /**
   * The title of the article.
   * Must be a non-empty string.
   */
  title: z.string().min(1, 'Article title must be a non-empty string'),

  /**
   * The content of the article.
   * Must be a non-empty string.
   */
  article: z.string().min(1, 'Article content must be a non-empty string'),

  /**
   * The order of the article.
   * Must be a number greater than 0.
   */
  order: z.number().min(1, 'Article order must be greater than 0')
})

/**
 * Zod validation schema for an array of articles.
 * Ensures that the array contains at least one article and that each article follows the articleSchema.
 * @type {z}
 */
const articlesSchema = z.array(articleSchema).nonempty('At least one article is required')

export default articlesSchema
