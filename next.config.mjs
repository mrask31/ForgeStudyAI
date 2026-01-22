/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // Tells webpack to ignore the 'canvas' dependency
        // This fixes the "Module not found: Can't resolve 'canvas'" error
        config.resolve.alias.canvas = false;
        
        return config;
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    async redirects() {
        return [
            {
                source: "/:path*",
                has: [{ type: "host", value: "forgestudyai.com" }],
                destination: "https://www.forgestudyai.com/:path*",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;