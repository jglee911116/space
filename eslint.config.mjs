import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = [...nextVitals, ...nextTs, prettier, { ignores: ['.next/**', 'next-env.d.ts', 'public/draco/**'] }];

export default eslintConfig;
