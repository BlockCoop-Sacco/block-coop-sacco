import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5173,
    },
  },
  optimizeDeps: {
    exclude: [
      'lucide-react',
      '@web3modal/ethers',
      '@web3modal/wagmi',
      'ethers',
      '@ethersproject/providers',
      '@ethersproject/contracts',
      '@ethersproject/wallet',
      '@walletconnect/ethereum-provider',
      '@walletconnect/modal'
    ],
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
});
