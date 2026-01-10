/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // Tells webpack to ignore the 'canvas' dependency
        // This fixes the "Module not found: Can't resolve 'canvas'" error
        config.resolve.alias.canvas = false;
        
        return config;
    },
};

export default nextConfig;