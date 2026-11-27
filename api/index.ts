import api from "../server/app";
export default {
  fetch(request: Request) {
    const url = new URL(request.url);
    const route =
      url.searchParams.get("__axon_route") ??
      url.pathname.replace(/^\/api\/?/, "");
    url.pathname = "/" + route.replace(/^\/+/, "");
    url.searchParams.delete("__axon_route");
    return api.fetch(new Request(url, request));
  },
};
