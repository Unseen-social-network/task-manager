export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.left = '-9999px'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, textArea.value.length)

  const successful = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!successful) {
    throw new Error('Clipboard copy failed')
  }
}
