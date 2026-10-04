import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["app/layout.tsx"],
    rules: { "@next/next/no-css-tags": "off" },
  },
  {
    files: ["app/_components/FeatureComponents/LoginForm/LoginForm.tsx"],
    rules: { "@next/next/no-location-assign-relative-destination": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".claude/**",
    ],
  },
];

export default eslintConfig;
