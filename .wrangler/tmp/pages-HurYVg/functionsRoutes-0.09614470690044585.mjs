import { onRequest as __api___path___js_onRequest } from "D:\\Code\\iFlow\\gupiaoshouyi-clac-D1\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]