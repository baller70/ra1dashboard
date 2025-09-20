// Communication constants for RA1 Basketball Dashboard

// Kevin Houston's signature block for all communications
export const SIGNATURE_BLOCK = {
  // Plain text version for AI messages, SMS, and plain text emails
  PLAIN_TEXT: `

---

Kevin Houston  
Rise as One Director  
" A program built by hard working kids and realistic parents "`,

  // HTML version for HTML emails and web-based messages
  HTML: `
<br><br>
<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
<br>
<strong>Kevin Houston</strong><br>
<em>Rise as One Director</em><br>
" A program built by hard working kids and realistic parents "`,

  // Markdown version for markdown-formatted messages
  MARKDOWN: `

---

**Kevin Houston**  
*Rise as One Director*  
" A program built by hard working kids and realistic parents "`
}

// Helper function to append signature to messages
export function appendSignature(message: string, format: 'plain' | 'html' | 'markdown' = 'plain'): string {
  switch (format) {
    case 'html':
      return message + SIGNATURE_BLOCK.HTML
    case 'markdown':
      return message + SIGNATURE_BLOCK.MARKDOWN
    case 'plain':
    default:
      return message + SIGNATURE_BLOCK.PLAIN_TEXT
  }
}

// Program information constants
export const PROGRAM_INFO = {
  NAME: 'Rise as One Yearly Program',
  DIRECTOR: 'Kevin Houston',
  TAGLINE: 'A program built by hard working kids and realistic parents'
}
