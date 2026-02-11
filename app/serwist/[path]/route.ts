import { createSerwistRoute } from "@serwist/turbopack";

const { GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
});

export { GET };
