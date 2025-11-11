import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

// ✅ Function that builds a new source dynamically
export function getSource() {
  return loader({
    baseUrl: '/blog',
    source: docs.toFumadocsSource(),
  });
}

// ✅ In production, keep one static source (for performance)
// ✅ In local dev, always rebuild source dynamically
export const source =
  process.env.NODE_ENV === 'production' ? getSource() : getSource();
