const apiBase = process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:5000";
const normalizedApiBase = apiBase.replace(/\/$/, "");

export default defineNuxtConfig({
  compatibilityDate: "2026-05-15",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/api/**": {
      proxy: `${normalizedApiBase}/api/**`
    }
  },
  runtimeConfig: {
    public: {
      apiBase
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
});
