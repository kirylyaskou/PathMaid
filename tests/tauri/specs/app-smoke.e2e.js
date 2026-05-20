describe('PathMaid native shell', () => {
  it('boots inside the Tauri WebView', async () => {
    await browser.waitUntil(
      async () => (await browser.getTitle()) === 'PathMaid',
      {
        timeout: 20000,
        timeoutMsg: 'PathMaid window did not expose the expected title.',
      },
    )

    await expect($('body')).toBeDisplayed()
  })

  it('does not fall back to the browser-only invoke failure', async () => {
    const initFailure = $('//*[contains(text(), "Failed to initialize database")]')
    await expect(initFailure).not.toExist()
  })
})
