import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { ReactNode } from 'react'


const genericComponents = {
  Check: ({ size }: { size: number }) => (
    <span className="inline-flex align-middle text-green-600">&#10003;</span>
  ),
  Cross: ({ size }: { size: number }): ReactNode => (
    <span className="inline-flex align-middle text-gray-900">&#10060;</span>
  ),

}

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(
  components?: MDXComponents,
  opts?: { isApp?: boolean; isPages?: boolean }
): MDXComponents {
  const isApp = opts?.isApp || true
  const isPages = opts?.isPages

  return {
    ...defaultMdxComponents,
    ...genericComponents,
    ul: ({ children }) => (
      <ul className="list-disc pl-5 space-y-1 my-1 mb-6">{children}</ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal pl-5 space-y-1 my-2 mb-6">{children}</ol>
    ),
    AppOnly: ({ children }: { children: ReactNode }): ReactNode =>
      isApp ? children : null,
    PagesOnly: ({ children }: { children: ReactNode }): ReactNode =>
      isPages ? children : null,
    ...components,
  }
}