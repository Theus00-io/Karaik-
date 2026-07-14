const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Este monorepo usa pnpm. Execute: pnpm install");
  process.exit(1);
}
