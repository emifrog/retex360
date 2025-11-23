import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export des routes pour GET et POST
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
