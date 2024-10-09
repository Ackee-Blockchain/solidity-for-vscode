import { spawn } from 'child_process';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import sveltePreprocess from "svelte-preprocess";

const production = !process.env.ROLLUP_WATCH;

const _defaultConfig = {
    plugins: [

        svelte({
            compilerOptions: {
                dev: !production
            },
            preprocess: sveltePreprocess({
                sourceMap: !production,
                postcss: true,
                // typescript: true,
            }),
        }),
        css({ output: 'bundle.css' }),

        resolve({
            browser: true,
            dedupe: ['svelte'],
            exportConditions: ['svelte']
        }),
        commonjs(),
        typescript({ sourceMap: !production }),
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};

export default [
    // {
    //     input: 'src/pages/run/run.ts',
    //     output: {
    //         sourcemap: true,
    //         format: 'cjs',
    //         name: 'app',
    //         file: 'dist/run/webview.js'
    //     },
    //     ..._defaultConfig,
    // },
    // {
    //     input: 'src/pages/compile-deploy/compile-deploy.ts',
    //     output: {
    //         sourcemap: true,
    //         format: 'cjs',
    //         name: 'app',
    //         file: 'dist/compile-deploy/webview.js'
    //     },
    //     ..._defaultConfig,
    // },
    {
        input: 'src/app.ts',
        output: {
            sourcemap: true,
            format: 'cjs',
            name: 'app',
            file: 'dist/sake/webview.js'
        },
        ..._defaultConfig,
    },
];
