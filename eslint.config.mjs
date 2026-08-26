import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "storage/**",
      "prisma/migrations/**",
      "tsconfig.tsbuildinfo",
    ],
  },
]

export default eslintConfig
