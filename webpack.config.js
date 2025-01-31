module.exports = {
    // Other Webpack settings...
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: "pre",
          use: ["source-map-loader"],
          exclude: /node_modules/, // Exclude node_modules from source map processing
        },
      ],
    },
    ignoreWarnings: [
      {
        module: /lucide-react/, // Suppress warnings from lucide-react
      },
      {
        module: /source-map-loader/, // Suppress warnings from source-map-loader
      },
    ],
  };
  