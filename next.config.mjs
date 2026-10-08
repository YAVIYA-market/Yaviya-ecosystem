const nextConfig = {
  reactStrictMode: false,
  outputFileTracingIncludes: {
    '/api/[[...route]]': ['./backend/**/*'],
  },
  async redirects() {
    return [{ source: '/index.html', destination: '/', permanent: false }];
  },
};
export default nextConfig;
