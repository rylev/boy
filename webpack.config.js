const path = require('path')

module.exports = {
    entry: "./src/main.tsx",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "/dist"),
        publicPath: "/dist/"
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        modules: [path.resolve(__dirname, "src"), "node_modules"],
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            { test: /\.tsx?$/, use: "awesome-typescript-loader" },
            { test: /\.css$/,  use: ['style-loader', 'css-loader', 'postcss-loader'] },

            { enforce: "pre", test: /\.js$/, use: "source-map-loader" }
        ]
    }
};
