import { z } from 'zod'

/**
 * Zod validation schema for a single article.
 * Ensures that the article data meets the requirements.
 */
const articleSchema = z.object({
  /**
   * The title of the article.
   */
  title: z.string(),

  /**
   * The content of the article.
   */
  article: z.string(),

  /**
   * The order of the article.
   */
  order: z.number()
})

/**
 * Schema for a single article response.
 */
export const articleResponseSchema = articleSchema
