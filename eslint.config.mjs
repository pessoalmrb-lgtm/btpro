import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**/*"],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
  }),
  firebaseRulesPlugin.configs['flat/recommended']
];

export default eslintConfig;
