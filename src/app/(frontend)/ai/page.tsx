import { AiDocsWorkbench } from './workbench'
import { createSEOPageMetadata } from '../_content/contentHelpers'

export const metadata = createSEOPageMetadata({
  description: 'AI workspace for content generation, document QA, editor testing, and CMS validation.',
  path: '/ai',
  title: 'Payload AI Workbench',
  type: 'website',
})

export default function Page() {
  return <AiDocsWorkbench />
}
