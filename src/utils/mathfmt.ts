import React, { type ReactNode } from 'react'

// Inline math markup used across lesson content and task prompts:
//   ^..^  superscript            a^2^ + b^2^ = c^2^   → a² + b² = c²
//   ~..~  subscript              log~2~(x)           → log₂(x)
//   [a/b] stacked fraction        [1/2]·a·h            → ½ rendered as a vertical fraction
// Everything else is rendered as plain text.

const TOKEN = /(~[^~]+~|\^[^ \^]+\^|\[[^\[\]/]+\/[^\[\]/]+\])/g

export function renderMath(markup: string): ReactNode {
  const tokens = markup.split(TOKEN)
  const out: ReactNode[] = []
  tokens.forEach((tok, i) => {
    if (!tok) return
    if (tok.length > 2 && tok.startsWith('~') && tok.endsWith('~')) {
      out.push(React.createElement('sub', { key: i }, tok.slice(1, -1)))
    } else if (tok.length > 2 && tok.startsWith('^') && tok.endsWith('^')) {
      out.push(React.createElement('sup', { key: i }, tok.slice(1, -1)))
    } else if (tok.startsWith('[') && tok.endsWith(']')) {
      const inner = tok.slice(1, -1)
      const cut = inner.indexOf('/')
      const num = inner.slice(0, cut)
      const den = inner.slice(cut + 1)
      out.push(
        React.createElement(
          'span',
          { key: i, className: 'frac' },
          React.createElement('span', { className: 'frac-n' }, num),
          React.createElement('span', { className: 'frac-d' }, den),
        ),
      )
    } else {
      out.push(tok)
    }
  })
  return React.createElement(React.Fragment, null, out)
}