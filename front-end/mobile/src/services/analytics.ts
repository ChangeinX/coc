export const analytics = {
  track: (event: string, props?: Record<string, unknown>) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[analytics] ${event}`, props ?? {});
    }
  },
};
