import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import robloxTs from "eslint-plugin-roblox-ts";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["out", "include", "node_modules"] },
	js.configs.recommended,
	tseslint.configs.recommended,
	robloxTs.configs.recommended,
	prettierRecommended,
	{
		rules: {
			"prettier/prettier": "warn",
		},
	},
);
