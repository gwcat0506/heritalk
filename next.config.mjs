/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 공공기관 이미지 서버(서울 문화공간정보·국가유산청) 원격 로딩 허용.
    remotePatterns: [
      { protocol: "https", hostname: "culture.seoul.go.kr" },
      { protocol: "https", hostname: "www.khs.go.kr" },
      { protocol: "http", hostname: "www.khs.go.kr" },
    ],
  },
};

export default nextConfig;
