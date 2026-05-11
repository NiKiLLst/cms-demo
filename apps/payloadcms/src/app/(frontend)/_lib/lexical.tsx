// Minimal Lexical-JSON → React renderer. Handles paragraph, text (with bold/italic),
// heading, list, listitem, link. Anything else is rendered as flat text.
// Good enough for demo content; swap for @payloadcms/richtext-lexical/react if
// richer rendering is needed.

import React from 'react'

type Node = {
  type: string
  tag?: string
  format?: number
  url?: string
  text?: string
  children?: Node[]
}

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2

function renderChildren(nodes: Node[] | undefined, keyPrefix = ''): React.ReactNode {
  if (!nodes) return null
  return nodes.map((n, i) => renderNode(n, `${keyPrefix}${i}-`))
}

function renderNode(node: Node, key: string): React.ReactNode {
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{renderChildren(node.children, key)}</p>
    case 'heading': {
      const Tag = (node.tag ?? 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return <Tag key={key}>{renderChildren(node.children, key)}</Tag>
    }
    case 'list': {
      const Tag = node.tag === 'ol' ? 'ol' : 'ul'
      return <Tag key={key}>{renderChildren(node.children, key)}</Tag>
    }
    case 'listitem':
      return <li key={key}>{renderChildren(node.children, key)}</li>
    case 'link':
      return (
        <a key={key} href={node.url ?? '#'} rel="noopener noreferrer">
          {renderChildren(node.children, key)}
        </a>
      )
    case 'text': {
      let el: React.ReactNode = node.text ?? ''
      if ((node.format ?? 0) & FORMAT_BOLD) el = <strong>{el}</strong>
      if ((node.format ?? 0) & FORMAT_ITALIC) el = <em>{el}</em>
      return <React.Fragment key={key}>{el}</React.Fragment>
    }
    default:
      return <React.Fragment key={key}>{renderChildren(node.children, key)}</React.Fragment>
  }
}

export function RichText({ data }: { data: { root?: { children?: Node[] } } | null | undefined }) {
  if (!data?.root?.children) return null
  return <>{renderChildren(data.root.children)}</>
}
