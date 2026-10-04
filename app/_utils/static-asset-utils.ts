const STATIC_ASSET_EXTENSION =
  /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|txt|xml|json|webmanifest)$/i;

export const isStaticAssetPath = (pathname: string): boolean =>
  STATIC_ASSET_EXTENSION.test(pathname);
