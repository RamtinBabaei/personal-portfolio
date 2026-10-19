declare module "virtual:portfolio-local-email" {
  export default function createTransport(fetcher: typeof fetch): typeof fetch;
}
