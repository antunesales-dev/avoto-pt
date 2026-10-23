// /despesa/:id → shell da SPA com <title>/og desta ficha (crawlers e pré-visualizações de links).
import { seoHandler } from '../../seo/pages-function.js'

export const onRequestGet = (context) => seoHandler(context, 'despesa')
