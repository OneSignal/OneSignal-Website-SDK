process.on('unhandledRejection', (reason, p) => {
  console.log('jest.setupfiles.ts: unhandledRejection: Unhandled Rejection at: Promise', p, 'reason:', reason);
});
