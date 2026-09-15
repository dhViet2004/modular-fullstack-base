import { defineConfig } from "vitest/config";
export default defineConfig({test:{fileParallelism:false,env:{NODE_ENV:"test",DATABASE_URL:"postgresql://postgres:postgres@localhost:5432/corestack_test",ACCESS_TOKEN_SECRET:"development_only_secret_change_me_123"}}});
