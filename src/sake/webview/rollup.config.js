import { spawn } from 'child_process';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import sveltePreprocess from "svelte-preprocess";

const production = !process.env.ROLLUP_WATCH;

const _defaultConfig = {
    plugins: [
        resolve({
            browser: true,
            dedupe: ['svelte'],
            exportConditions: ['svelte'],
            preferBuiltins: false
        }),
        commonjs({
            transformMixedEsModules: true,
            requireReturnsDefault: 'auto',
            ignore: ['bufferutil', 'utf-8-validate'],
            esmExternals: true
        }),
        svelte({
            compilerOptions: {
                dev: !production
            },
            preprocess: sveltePreprocess({
                sourceMap: !production,
                postcss: true,
            }),
        }),
        css({ output: 'bundle.css' }),
        json(),
        typescript({
            sourceMap: !production,
            compilerOptions: {
                module: "ESNext",
                moduleResolution: "node"
            }
        }),
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};

export default [
    {
        input: 'src/app.ts',
        output: {
            sourcemap: true,
            format: 'iife',
            name: 'app',
            file: 'dist/sake/webview.js',
            inlineDynamicImports: true,

        },
        ..._defaultConfig,
    },
];
