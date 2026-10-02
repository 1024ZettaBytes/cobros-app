import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Sin esto, Turbopack infiere la raíz del workspace mirando hacia arriba y
  // se topa con un package-lock.json fuera del repo.
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  // Next genera AGENTS.md y CLAUDE.md en cada build; este repo no los usa.
  agentRules: false,

  // `pg` y `web-push` usan APIs de Node que no hay que empaquetar.
  serverExternalPackages: ['pg', 'web-push'],
};

export default nextConfig;
