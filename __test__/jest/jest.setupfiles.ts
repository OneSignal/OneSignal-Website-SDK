process.on('unhandledRejection', (reason, p) => {
  console.log('jest.setupfile.ts: unhandledRejection: Unhandled Rejection at: Promise', p, 'reason:', reason);
});
