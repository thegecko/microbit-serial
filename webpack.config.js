//@ts-check
'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig **/
/** @type WebpackConfig */
module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    entry: {
        index: './src/index.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        iife: true
    },
    devServer: {
        static: __dirname,
        devMiddleware: {
            writeToDisk: true
        }
    }
};
