export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard access is not available in this browser.');
  }

  await navigator.clipboard.writeText(text);
}
