//@ts-check

'use strict';

// import WatchExternalFilesPlugin from 'webpack-watch-files-plugin';
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
// const WatchExternalFilesPlugin = require('webpack-watch-files-plugin');
const WatchExternalFilesPlugin = require('webpack-watch-external-files-plugin');


/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in webworker context for VS Code web 📖 -> https://webpack.js.org/configuration/target/#target

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    '@azure/functions-core': 'commonjs @azure/functions-core',
    'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    // mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
    mainFields: ['module', 'main'], // look for `module` entry point in imported node modules
    extensions: ['.ts', '.js'],
    alias: {
      // provides alternate implementation for node module and source files
    },
    fallback: {
      // Webpack 5 no longer polyfills Node.js core modules automatically.
      // see https://webpack.js.org/configuration/resolve/#resolvefallback
      // for the list of Node.js core module polyfills.
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [
            /node_modules/
        ],
        include: [
            /src/
        ],
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src/sake/webview/dist/sake/webview.js',
          to: 'sake/webview/sake/webview.js'
        },
        {
          from: 'src/sake/webview/dist/sake/bundle.css',
          to: 'sake/webview/sake/bundle.css'
        },
        {
            from: 'src/sake/media/reset.css',
            to: 'sake/media/reset.css'
        },
        {
            from: 'src/sake/media/vscode.css',
            to: 'sake/media/vscode.css'
        }
      ],
    }),
    // @ts-ignore
    new WatchExternalFilesPlugin({
      files: [
        'src/sake/webview/dist/**/*'
      ]
    }),
  ],
  // The 'exclude' property is not valid in this context, so it should be removed.
};

module.exports = config;