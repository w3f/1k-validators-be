export const sleep = (ms: number) => (
  new Promise((resolve: any) => {
    setTimeout(() => resolve(), ms);
  })
);