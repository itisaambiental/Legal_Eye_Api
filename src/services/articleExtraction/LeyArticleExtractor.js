import ArticleExtractor from './ArticleExtractor.js'

class LeyArticleExtractor extends ArticleExtractor {
  extractArticles () {
    return this.text
  }
}

export default LeyArticleExtractor
