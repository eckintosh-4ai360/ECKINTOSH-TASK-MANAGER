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
  {
    // Existing client components intentionally hydrate local state from server
    // props and browser subscriptions. Keep the standard Next/TypeScript rules
    // active while these components are migrated to derived state.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]

export default eslintConfig
