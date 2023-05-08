export function expectHeaderToBeSent() {
  expect(window.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({
        // made undercase automatically
        "sdk-version": expect.stringMatching(/onesignal\/web\/[0-9]+[0-9]+/)
      })
    })
  );
}
